package httpapp

import (
	"context"
	"fmt"
	"strings"
	"sync"
)

type WebResponse struct {
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

type WorkspaceMemberInvitationRequest struct {
	Email string  `json:"email"`
	Role  *string `json:"role"`
}

type ProjectCreateRequest struct {
	WorkspaceID int64  `json:"workspace_id"`
	Name        string `json:"name"`
}

type ProjectMemberGrantRequest struct {
	MemberID int64   `json:"member_id"`
	Role     *string `json:"role"`
}

type ClientCreateRequest struct {
	WorkspaceID int64  `json:"workspace_id"`
	Name        string `json:"name"`
}

type TaskCreateRequest struct {
	WorkspaceID int64  `json:"workspace_id"`
	Name        string `json:"name"`
}

type TagCreateRequest struct {
	WorkspaceID int64  `json:"workspace_id"`
	Name        string `json:"name"`
}

type GroupCreateRequest struct {
	WorkspaceID int64  `json:"workspace_id"`
	Name        string `json:"name"`
}

type WebHandlers struct {
	Tenant *WebTenantHandlers
	state  *webState
}

type WebTenantHandlers struct {
	state *webState
}

type webState struct {
	mu sync.RWMutex

	nextUserID      int64
	nextSessionID   int64
	nextOrgID       int64
	nextWorkspaceID int64
	nextMemberID    int64
	nextProjectID   int64
	nextClientID    int64
	nextTaskID      int64
	nextTagID       int64
	nextGroupID     int64

	users             map[int64]*userRecord
	usersByEmail      map[string]int64
	sessions          map[string]int64
	homes             map[int64]*homeRecord
	archivedHomes     map[int64]*homeRecord
	workspaceMembers  map[int64][]workspaceMemberRecord
	workspaceProjects map[int64][]projectRecord
	projectMembers    map[int64][]projectMemberRecord
	workspaceClients  map[int64][]clientRecord
	workspaceTasks    map[int64][]taskRecord
	workspaceTags     map[int64][]tagRecord
	workspaceGroups   map[int64][]groupRecord
}

type workspaceMemberRecord struct {
	ID          int64
	WorkspaceID int64
	Email       string
	Name        string
	Role        string
}

type projectRecord struct {
	ID          int64
	WorkspaceID int64
	Name        string
	Active      bool
	Pinned      bool
}

type projectMemberRecord struct {
	ProjectID int64
	MemberID  int64
	Role      string
}

type clientRecord struct {
	ID          int64
	WorkspaceID int64
	Name        string
	Active      bool
}

type taskRecord struct {
	ID          int64
	WorkspaceID int64
	Name        string
	Active      bool
}

type tagRecord struct {
	ID          int64
	WorkspaceID int64
	Name        string
	Active      bool
}

type groupRecord struct {
	ID          int64
	WorkspaceID int64
	Name        string
	Active      bool
}

type userRecord struct {
	ID                  int64
	Email               string
	Password            string
	Deactivated         bool
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

func NewWebHandlers() *WebHandlers {
	state := &webState{
		nextUserID:        1,
		nextSessionID:     1,
		nextOrgID:         1,
		nextWorkspaceID:   1,
		nextMemberID:      1,
		nextProjectID:     1001,
		nextClientID:      501,
		nextTaskID:        901,
		nextTagID:         801,
		nextGroupID:       701,
		users:             make(map[int64]*userRecord),
		usersByEmail:      make(map[string]int64),
		sessions:          make(map[string]int64),
		homes:             make(map[int64]*homeRecord),
		archivedHomes:     make(map[int64]*homeRecord),
		workspaceMembers:  make(map[int64][]workspaceMemberRecord),
		workspaceProjects: make(map[int64][]projectRecord),
		projectMembers:    make(map[int64][]projectMemberRecord),
		workspaceClients:  make(map[int64][]clientRecord),
		workspaceTasks:    make(map[int64][]taskRecord),
		workspaceTags:     make(map[int64][]tagRecord),
		workspaceGroups:   make(map[int64][]groupRecord),
	}
	return &WebHandlers{
		Tenant: &WebTenantHandlers{state: state},
		state:  state,
	}
}

/*
DeactivateUserByEmail marks the current Wave 1 runtime user as deactivated while
keeping any issued session ids intact.
*/
func (handlers *WebHandlers) DeactivateUserByEmail(email string) bool {
	handlers.state.mu.Lock()
	defer handlers.state.mu.Unlock()

	userID, ok := handlers.state.usersByEmail[normalizeEmail(email)]
	if !ok {
		return false
	}

	user := handlers.state.users[userID]
	if user == nil {
		return false
	}

	user.Deactivated = true
	home := handlers.ensureHomeLocked(user)
	homeCopy := home
	handlers.state.archivedHomes[userID] = &homeCopy
	delete(handlers.state.homes, userID)
	return true
}

func (handlers *WebHandlers) Register(_ context.Context, request RegisterRequest) WebResponse {
	email := normalizeEmail(request.Email)
	if email == "" || request.Password == "" || !strings.Contains(email, "@") {
		return WebResponse{StatusCode: 400, Body: "invalid registration payload"}
	}

	handlers.state.mu.Lock()
	defer handlers.state.mu.Unlock()

	if _, exists := handlers.state.usersByEmail[email]; exists {
		return WebResponse{StatusCode: 403, Body: "User does not have access to this resource."}
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

	return WebResponse{
		StatusCode: 201,
		Body:       handlers.sessionBootstrap(user, home),
		SessionID:  sessionID,
	}
}

func (handlers *WebHandlers) Login(_ context.Context, request LoginRequest) WebResponse {
	email := normalizeEmail(request.Email)
	if email == "" || request.Password == "" {
		return WebResponse{StatusCode: 403, Body: "User does not have access to this resource."}
	}

	handlers.state.mu.Lock()
	defer handlers.state.mu.Unlock()

	userID, ok := handlers.state.usersByEmail[email]
	if !ok {
		return WebResponse{StatusCode: 403, Body: "User does not have access to this resource."}
	}
	user := handlers.state.users[userID]
	if user == nil || user.Deactivated || user.Password != request.Password {
		return WebResponse{StatusCode: 403, Body: "User does not have access to this resource."}
	}

	home := handlers.ensureHomeLocked(user)
	if user.DefaultWorkspaceID == 0 {
		user.DefaultWorkspaceID = home.WorkspaceID
	}
	sessionID := handlers.newSessionLocked(user.ID)
	return WebResponse{
		StatusCode: 200,
		Body:       handlers.sessionBootstrap(user, home),
		SessionID:  sessionID,
	}
}

func (handlers *WebHandlers) Logout(_ context.Context, sessionID string) WebResponse {
	handlers.state.mu.Lock()
	defer handlers.state.mu.Unlock()

	if _, ok := handlers.state.sessions[sessionID]; !ok {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	delete(handlers.state.sessions, sessionID)
	return WebResponse{StatusCode: 204}
}

func (handlers *WebHandlers) GetSession(_ context.Context, sessionID string) WebResponse {
	handlers.state.mu.Lock()
	defer handlers.state.mu.Unlock()

	user, home, ok := handlers.userAndHomeBySessionLocked(sessionID)
	if !ok {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	return WebResponse{
		StatusCode: 200,
		Body:       handlers.sessionBootstrap(user, home),
	}
}

func (handlers *WebHandlers) GetProfile(_ context.Context, sessionID string) WebResponse {
	handlers.state.mu.RLock()
	defer handlers.state.mu.RUnlock()

	user, ok := handlers.userBySessionLocked(sessionID)
	if !ok {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	return WebResponse{
		StatusCode: 200,
		Body:       handlers.profileBody(user),
	}
}

func (handlers *WebHandlers) UpdateProfile(_ context.Context, sessionID string, request ProfileRequest) WebResponse {
	handlers.state.mu.Lock()
	defer handlers.state.mu.Unlock()

	user, ok := handlers.userBySessionLocked(sessionID)
	if !ok {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	if user.Deactivated {
		return WebResponse{StatusCode: 403, Body: "User does not have access to this resource."}
	}
	if request.Email != "" {
		nextEmail := normalizeEmail(request.Email)
		if nextEmail == "" || !strings.Contains(nextEmail, "@") {
			return WebResponse{StatusCode: 400, Body: "invalid email"}
		}
		if existingUserID, exists := handlers.state.usersByEmail[nextEmail]; exists && existingUserID != user.ID {
			return WebResponse{StatusCode: 403, Body: "User does not have access to this resource."}
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
	return WebResponse{
		StatusCode: 200,
		Body:       handlers.profileBody(user),
	}
}

/*
ResetAPIToken rotates the current user's API token in the Wave 1 in-memory web
runtime and returns the minimal current-user token payload.
*/
func (handlers *WebHandlers) ResetAPIToken(_ context.Context, sessionID string) WebResponse {
	handlers.state.mu.Lock()
	defer handlers.state.mu.Unlock()

	user, ok := handlers.userBySessionLocked(sessionID)
	if !ok {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	if user.Deactivated {
		return WebResponse{StatusCode: 403, Body: "User does not have access to this resource."}
	}

	user.APIToken = fmt.Sprintf("api-token-%d-%d", user.ID, handlers.state.nextSessionID)
	return WebResponse{
		StatusCode: 200,
		Body: map[string]any{
			"api_token": user.APIToken,
		},
	}
}

func (handlers *WebHandlers) GetPreferences(_ context.Context, sessionID string) WebResponse {
	handlers.state.mu.RLock()
	defer handlers.state.mu.RUnlock()

	user, ok := handlers.userBySessionLocked(sessionID)
	if !ok {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	return WebResponse{
		StatusCode: 200,
		Body:       handlers.preferencesBody(user),
	}
}

func (handlers *WebHandlers) UpdatePreferences(_ context.Context, sessionID string, request PreferencesRequest) WebResponse {
	handlers.state.mu.Lock()
	defer handlers.state.mu.Unlock()

	user, ok := handlers.userBySessionLocked(sessionID)
	if !ok {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	if user.Deactivated {
		return WebResponse{StatusCode: 403, Body: "User does not have access to this resource."}
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
	return WebResponse{
		StatusCode: 200,
		Body:       handlers.preferencesBody(user),
	}
}

func (handlers *WebHandlers) ensureHomeLocked(user *userRecord) homeRecord {
	home := handlers.state.homes[user.ID]
	if home != nil {
		return *home
	}
	if user.Deactivated {
		archived := handlers.state.archivedHomes[user.ID]
		if archived != nil {
			return *archived
		}
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
	handlers.state.seedWorkspaceMembersLocked(*home, user)
	handlers.state.seedWorkspaceProjectsLocked(*home)
	handlers.state.seedWorkspaceClientsLocked(*home)
	handlers.state.seedWorkspaceTasksLocked(*home)
	handlers.state.seedWorkspaceTagsLocked(*home)
	handlers.state.seedWorkspaceGroupsLocked(*home)
	return *home
}

func (state *webState) seedWorkspaceMembersLocked(home homeRecord, user *userRecord) {
	if _, ok := state.workspaceMembers[home.WorkspaceID]; ok {
		return
	}

	state.workspaceMembers[home.WorkspaceID] = []workspaceMemberRecord{
		{
			ID:          state.nextMemberID,
			WorkspaceID: home.WorkspaceID,
			Email:       user.Email,
			Name:        user.FullName,
			Role:        "owner",
		},
	}
	state.nextMemberID++
}

func (state *webState) seedWorkspaceProjectsLocked(home homeRecord) {
	if _, ok := state.workspaceProjects[home.WorkspaceID]; ok {
		return
	}

	state.workspaceProjects[home.WorkspaceID] = []projectRecord{
		{
			ID:          state.nextProjectID,
			WorkspaceID: home.WorkspaceID,
			Name:        "Sample Project",
			Active:      true,
		},
	}
	state.seedProjectMembersLocked(state.workspaceProjects[home.WorkspaceID][0])
	state.nextProjectID++
}

func (state *webState) seedProjectMembersLocked(project projectRecord) {
	if _, ok := state.projectMembers[project.ID]; ok {
		return
	}

	workspaceMembers := state.workspaceMembers[project.WorkspaceID]
	if len(workspaceMembers) == 0 {
		state.projectMembers[project.ID] = []projectMemberRecord{}
		return
	}

	state.projectMembers[project.ID] = []projectMemberRecord{
		{
			ProjectID: project.ID,
			MemberID:  workspaceMembers[0].ID,
			Role:      "admin",
		},
	}
}

func (state *webState) projectByIDLocked(projectID int64) (projectRecord, bool) {
	for _, projects := range state.workspaceProjects {
		for _, project := range projects {
			if project.ID == projectID {
				return project, true
			}
		}
	}
	return projectRecord{}, false
}

func (state *webState) mutateProjectByIDLocked(
	projectID int64,
	mutate func(project *projectRecord),
) (projectRecord, bool) {
	for workspaceID, projects := range state.workspaceProjects {
		for index := range projects {
			if projects[index].ID != projectID {
				continue
			}

			mutate(&projects[index])
			state.workspaceProjects[workspaceID][index] = projects[index]
			return projects[index], true
		}
	}

	return projectRecord{}, false
}

func projectSummaryBody(project projectRecord) map[string]any {
	return map[string]any{
		"id":           project.ID,
		"name":         project.Name,
		"workspace_id": project.WorkspaceID,
		"active":       project.Active,
		"pinned":       project.Pinned,
	}
}

func (state *webState) workspaceMemberByIDLocked(
	workspaceID int64,
	memberID int64,
) (workspaceMemberRecord, bool) {
	for _, member := range state.workspaceMembers[workspaceID] {
		if member.ID == memberID {
			return member, true
		}
	}
	return workspaceMemberRecord{}, false
}

func (state *webState) seedWorkspaceClientsLocked(home homeRecord) {
	if _, ok := state.workspaceClients[home.WorkspaceID]; ok {
		return
	}

	state.workspaceClients[home.WorkspaceID] = []clientRecord{
		{
			ID:          state.nextClientID,
			WorkspaceID: home.WorkspaceID,
			Name:        "North Ridge Client",
			Active:      true,
		},
	}
	state.nextClientID++
}

func (state *webState) seedWorkspaceTasksLocked(home homeRecord) {
	if _, ok := state.workspaceTasks[home.WorkspaceID]; ok {
		return
	}

	state.workspaceTasks[home.WorkspaceID] = []taskRecord{
		{
			ID:          state.nextTaskID,
			WorkspaceID: home.WorkspaceID,
			Name:        "Weekly Sync",
			Active:      true,
		},
	}
	state.nextTaskID++
}

func (state *webState) seedWorkspaceTagsLocked(home homeRecord) {
	if _, ok := state.workspaceTags[home.WorkspaceID]; ok {
		return
	}

	state.workspaceTags[home.WorkspaceID] = []tagRecord{
		{
			ID:          state.nextTagID,
			WorkspaceID: home.WorkspaceID,
			Name:        "billable",
			Active:      true,
		},
	}
	state.nextTagID++
}

func (state *webState) seedWorkspaceGroupsLocked(home homeRecord) {
	if _, ok := state.workspaceGroups[home.WorkspaceID]; ok {
		return
	}

	state.workspaceGroups[home.WorkspaceID] = []groupRecord{
		{
			ID:          state.nextGroupID,
			WorkspaceID: home.WorkspaceID,
			Name:        "Design",
			Active:      true,
		},
	}
	state.nextGroupID++
}

func (handlers *WebHandlers) newSessionLocked(userID int64) string {
	sessionID := fmt.Sprintf("session-%d", handlers.state.nextSessionID)
	handlers.state.nextSessionID++
	handlers.state.sessions[sessionID] = userID
	return sessionID
}

func (handlers *WebHandlers) userBySessionLocked(sessionID string) (*userRecord, bool) {
	userID, ok := handlers.state.sessions[sessionID]
	if !ok {
		return nil, false
	}
	user := handlers.state.users[userID]
	return user, user != nil
}

func (handlers *WebHandlers) userAndHomeBySessionLocked(sessionID string) (*userRecord, homeRecord, bool) {
	user, ok := handlers.userBySessionLocked(sessionID)
	if !ok {
		return nil, homeRecord{}, false
	}
	home := handlers.ensureHomeLocked(user)
	return user, home, true
}

func (handlers *WebHandlers) sessionBootstrap(user *userRecord, home homeRecord) map[string]any {
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

func (handlers *WebHandlers) profileBody(user *userRecord) map[string]any {
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

func (handlers *WebHandlers) preferencesBody(user *userRecord) map[string]any {
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

func (handlers *WebHandlers) capabilityBody(home homeRecord) map[string]any {
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

func (handlers *WebHandlers) quotaBody(home homeRecord) map[string]any {
	return map[string]any{
		"organization_id": home.OrganizationID,
		"remaining":       20,
		"resets_in_secs":  600,
		"total":           100,
	}
}

func (handlers *WebHandlers) organizationBody(home homeRecord) map[string]any {
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

func (handlers *WebHandlers) workspaceBody(home homeRecord) map[string]any {
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
func (h *WebTenantHandlers) ListWorkspaceMembers(ctx context.Context, sessionID string, workspaceID int64) WebResponse {
	_ = ctx
	_ = sessionID

	h.state.mu.RLock()
	defer h.state.mu.RUnlock()

	members := make([]map[string]any, 0, len(h.state.workspaceMembers[workspaceID]))
	for _, member := range h.state.workspaceMembers[workspaceID] {
		members = append(members, map[string]any{
			"id":           member.ID,
			"workspace_id": member.WorkspaceID,
			"email":        member.Email,
			"name":         member.Name,
			"role":         member.Role,
		})
	}

	return WebResponse{
		StatusCode: 200,
		Body: map[string]any{
			"members": members,
		},
	}
}

/*
ListProjectMembers returns a minimal project-member envelope for the current session.
*/
func (h *WebTenantHandlers) ListProjectMembers(ctx context.Context, sessionID string, projectID int64) WebResponse {
	_ = ctx

	h.state.mu.RLock()
	defer h.state.mu.RUnlock()

	userID, ok := h.state.sessions[sessionID]
	if !ok {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	user := h.state.users[userID]
	if user == nil {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	project, ok := h.state.projectByIDLocked(projectID)
	if !ok {
		return WebResponse{StatusCode: 404, Body: "Project not found"}
	}
	if user.DefaultWorkspaceID != 0 && user.DefaultWorkspaceID != project.WorkspaceID {
		return WebResponse{StatusCode: 403, Body: "User does not have access to this resource."}
	}

	members := make([]map[string]any, 0, len(h.state.projectMembers[projectID]))
	for _, member := range h.state.projectMembers[projectID] {
		members = append(members, map[string]any{
			"project_id": member.ProjectID,
			"member_id":  member.MemberID,
			"role":       member.Role,
		})
	}

	return WebResponse{
		StatusCode: 200,
		Body: map[string]any{
			"members": members,
		},
	}
}

/*
InviteWorkspaceMember accepts a minimal invitation payload for the caller's workspace.
*/
func (h *WebTenantHandlers) InviteWorkspaceMember(ctx context.Context, sessionID string, workspaceID int64, request WorkspaceMemberInvitationRequest) WebResponse {
	_ = ctx

	email := normalizeEmail(request.Email)
	if email == "" || !strings.Contains(email, "@") {
		return WebResponse{StatusCode: 400, Body: "invalid workspace member invitation payload"}
	}

	h.state.mu.Lock()
	defer h.state.mu.Unlock()

	userID, ok := h.state.sessions[sessionID]
	if !ok {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	user := h.state.users[userID]
	if user == nil {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	if user.DefaultWorkspaceID != 0 && user.DefaultWorkspaceID != workspaceID {
		return WebResponse{StatusCode: 403, Body: "User does not have access to this resource."}
	}

	name := strings.TrimSpace(strings.Split(email, "@")[0])
	if name == "" {
		name = email
	}
	role := "member"
	if request.Role != nil && strings.TrimSpace(*request.Role) != "" {
		role = strings.TrimSpace(*request.Role)
	}

	member := workspaceMemberRecord{
		ID:          h.state.nextMemberID,
		WorkspaceID: workspaceID,
		Email:       email,
		Name:        name,
		Role:        role,
	}
	h.state.nextMemberID++
	h.state.workspaceMembers[workspaceID] = append(h.state.workspaceMembers[workspaceID], member)

	return WebResponse{
		StatusCode: 201,
		Body: map[string]any{
			"id":           member.ID,
			"workspace_id": member.WorkspaceID,
			"email":        member.Email,
			"name":         member.Name,
			"role":         member.Role,
		},
	}
}

/*
GrantProjectMember adds or updates a minimal project-member grant for the current session.
*/
func (h *WebTenantHandlers) GrantProjectMember(
	ctx context.Context,
	sessionID string,
	projectID int64,
	request ProjectMemberGrantRequest,
) WebResponse {
	_ = ctx

	if request.MemberID <= 0 {
		return WebResponse{StatusCode: 400, Body: "invalid project member payload"}
	}

	role := "member"
	if request.Role != nil && strings.TrimSpace(*request.Role) != "" {
		role = strings.TrimSpace(*request.Role)
	}

	h.state.mu.Lock()
	defer h.state.mu.Unlock()

	userID, ok := h.state.sessions[sessionID]
	if !ok {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	user := h.state.users[userID]
	if user == nil {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	project, ok := h.state.projectByIDLocked(projectID)
	if !ok {
		return WebResponse{StatusCode: 404, Body: "Project not found"}
	}
	if user.DefaultWorkspaceID != 0 && user.DefaultWorkspaceID != project.WorkspaceID {
		return WebResponse{StatusCode: 403, Body: "User does not have access to this resource."}
	}
	if _, ok := h.state.workspaceMemberByIDLocked(project.WorkspaceID, request.MemberID); !ok {
		return WebResponse{StatusCode: 404, Body: "Workspace member not found"}
	}

	for index, member := range h.state.projectMembers[project.ID] {
		if member.MemberID != request.MemberID {
			continue
		}
		h.state.projectMembers[project.ID][index].Role = role
		return WebResponse{
			StatusCode: 201,
			Body: map[string]any{
				"project_id": project.ID,
				"member_id":  request.MemberID,
				"role":       role,
			},
		}
	}

	member := projectMemberRecord{
		ProjectID: project.ID,
		MemberID:  request.MemberID,
		Role:      role,
	}
	h.state.projectMembers[project.ID] = append(h.state.projectMembers[project.ID], member)

	return WebResponse{
		StatusCode: 201,
		Body: map[string]any{
			"project_id": member.ProjectID,
			"member_id":  member.MemberID,
			"role":       member.Role,
		},
	}
}

/*
RevokeProjectMember removes a minimal project-member grant for the current session.
*/
func (h *WebTenantHandlers) RevokeProjectMember(
	ctx context.Context,
	sessionID string,
	projectID int64,
	memberID int64,
) WebResponse {
	_ = ctx

	h.state.mu.Lock()
	defer h.state.mu.Unlock()

	userID, ok := h.state.sessions[sessionID]
	if !ok {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	user := h.state.users[userID]
	if user == nil {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	project, ok := h.state.projectByIDLocked(projectID)
	if !ok {
		return WebResponse{StatusCode: 404, Body: "Project not found"}
	}
	if user.DefaultWorkspaceID != 0 && user.DefaultWorkspaceID != project.WorkspaceID {
		return WebResponse{StatusCode: 403, Body: "User does not have access to this resource."}
	}

	projectMembers := h.state.projectMembers[project.ID]
	for index, member := range projectMembers {
		if member.MemberID != memberID {
			continue
		}
		h.state.projectMembers[project.ID] = append(projectMembers[:index], projectMembers[index+1:]...)
		return WebResponse{StatusCode: 204}
	}

	return WebResponse{StatusCode: 404, Body: "Project member not found"}
}

// CreateProject accepts a minimal project payload for the caller's workspace.
func (h *WebTenantHandlers) CreateProject(ctx context.Context, sessionID string, request ProjectCreateRequest) WebResponse {
	_ = ctx

	if request.WorkspaceID <= 0 || strings.TrimSpace(request.Name) == "" {
		return WebResponse{StatusCode: 400, Body: "invalid project payload"}
	}

	h.state.mu.Lock()
	defer h.state.mu.Unlock()

	userID, ok := h.state.sessions[sessionID]
	if !ok {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	user := h.state.users[userID]
	if user == nil {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	if user.DefaultWorkspaceID != 0 && user.DefaultWorkspaceID != request.WorkspaceID {
		return WebResponse{StatusCode: 403, Body: "User does not have access to this resource."}
	}

	project := projectRecord{
		ID:          h.state.nextProjectID,
		WorkspaceID: request.WorkspaceID,
		Name:        strings.TrimSpace(request.Name),
		Active:      true,
		Pinned:      false,
	}
	h.state.nextProjectID++
	h.state.workspaceProjects[request.WorkspaceID] = append(
		h.state.workspaceProjects[request.WorkspaceID],
		project,
	)
	h.state.seedProjectMembersLocked(project)

	return WebResponse{
		StatusCode: 201,
		Body:       projectSummaryBody(project),
	}
}

// ListProjects returns a simple projects envelope based on the requested workspace.
func (h *WebTenantHandlers) ListProjects(ctx context.Context, sessionID string, request ListProjectsRequest) WebResponse {
	_ = ctx
	_ = sessionID

	h.state.mu.RLock()
	defer h.state.mu.RUnlock()

	workspaceID := int64(1)
	if request.WorkspaceID != nil && *request.WorkspaceID != 0 {
		workspaceID = *request.WorkspaceID
	}

	projects := make([]map[string]any, 0, len(h.state.workspaceProjects[workspaceID]))
	for _, project := range h.state.workspaceProjects[workspaceID] {
		if request.Status != nil {
			switch *request.Status {
			case "active":
				if !project.Active {
					continue
				}
			case "archived":
				if project.Active {
					continue
				}
			}
		}

		projects = append(projects, projectSummaryBody(project))
	}

	return WebResponse{
		StatusCode: 200,
		Body: map[string]any{
			"projects": projects,
		},
	}
}

// GetProject returns a minimal project payload by id.
func (h *WebTenantHandlers) GetProject(ctx context.Context, sessionID string, projectID int64) WebResponse {
	_ = ctx
	_ = sessionID

	h.state.mu.RLock()
	defer h.state.mu.RUnlock()

	project, ok := h.state.projectByIDLocked(projectID)
	if !ok {
		return WebResponse{StatusCode: 404, Body: "Project not found"}
	}

	return WebResponse{
		StatusCode: 200,
		Body:       projectSummaryBody(project),
	}
}

func (h *WebTenantHandlers) ArchiveProject(
	ctx context.Context,
	sessionID string,
	projectID int64,
) WebResponse {
	_ = ctx

	h.state.mu.Lock()
	defer h.state.mu.Unlock()

	userID, ok := h.state.sessions[sessionID]
	if !ok {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	user := h.state.users[userID]
	if user == nil {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}

	project, ok := h.state.projectByIDLocked(projectID)
	if !ok {
		return WebResponse{StatusCode: 404, Body: "Project not found"}
	}
	if user.DefaultWorkspaceID != 0 && user.DefaultWorkspaceID != project.WorkspaceID {
		return WebResponse{StatusCode: 403, Body: "User does not have access to this resource."}
	}

	project, ok = h.state.mutateProjectByIDLocked(projectID, func(project *projectRecord) {
		project.Active = false
	})
	if !ok {
		return WebResponse{StatusCode: 404, Body: "Project not found"}
	}

	return WebResponse{StatusCode: 200, Body: projectSummaryBody(project)}
}

func (h *WebTenantHandlers) RestoreProject(
	ctx context.Context,
	sessionID string,
	projectID int64,
) WebResponse {
	_ = ctx

	h.state.mu.Lock()
	defer h.state.mu.Unlock()

	userID, ok := h.state.sessions[sessionID]
	if !ok {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	user := h.state.users[userID]
	if user == nil {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}

	project, ok := h.state.projectByIDLocked(projectID)
	if !ok {
		return WebResponse{StatusCode: 404, Body: "Project not found"}
	}
	if user.DefaultWorkspaceID != 0 && user.DefaultWorkspaceID != project.WorkspaceID {
		return WebResponse{StatusCode: 403, Body: "User does not have access to this resource."}
	}

	project, ok = h.state.mutateProjectByIDLocked(projectID, func(project *projectRecord) {
		project.Active = true
	})
	if !ok {
		return WebResponse{StatusCode: 404, Body: "Project not found"}
	}

	return WebResponse{StatusCode: 200, Body: projectSummaryBody(project)}
}

func (h *WebTenantHandlers) PinProject(
	ctx context.Context,
	sessionID string,
	projectID int64,
) WebResponse {
	_ = ctx

	h.state.mu.Lock()
	defer h.state.mu.Unlock()

	userID, ok := h.state.sessions[sessionID]
	if !ok {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	user := h.state.users[userID]
	if user == nil {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}

	project, ok := h.state.projectByIDLocked(projectID)
	if !ok {
		return WebResponse{StatusCode: 404, Body: "Project not found"}
	}
	if user.DefaultWorkspaceID != 0 && user.DefaultWorkspaceID != project.WorkspaceID {
		return WebResponse{StatusCode: 403, Body: "User does not have access to this resource."}
	}

	project, ok = h.state.mutateProjectByIDLocked(projectID, func(project *projectRecord) {
		project.Pinned = true
	})
	if !ok {
		return WebResponse{StatusCode: 404, Body: "Project not found"}
	}

	return WebResponse{StatusCode: 200, Body: projectSummaryBody(project)}
}

func (h *WebTenantHandlers) UnpinProject(
	ctx context.Context,
	sessionID string,
	projectID int64,
) WebResponse {
	_ = ctx

	h.state.mu.Lock()
	defer h.state.mu.Unlock()

	userID, ok := h.state.sessions[sessionID]
	if !ok {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	user := h.state.users[userID]
	if user == nil {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}

	project, ok := h.state.projectByIDLocked(projectID)
	if !ok {
		return WebResponse{StatusCode: 404, Body: "Project not found"}
	}
	if user.DefaultWorkspaceID != 0 && user.DefaultWorkspaceID != project.WorkspaceID {
		return WebResponse{StatusCode: 403, Body: "User does not have access to this resource."}
	}

	project, ok = h.state.mutateProjectByIDLocked(projectID, func(project *projectRecord) {
		project.Pinned = false
	})
	if !ok {
		return WebResponse{StatusCode: 404, Body: "Project not found"}
	}

	return WebResponse{StatusCode: 200, Body: projectSummaryBody(project)}
}

// ListClients returns a simple clients envelope based on the requested workspace.
func (h *WebTenantHandlers) ListClients(ctx context.Context, sessionID string, request ListProjectsRequest) WebResponse {
	_ = ctx
	_ = sessionID

	h.state.mu.RLock()
	defer h.state.mu.RUnlock()

	workspaceID := int64(1)
	if request.WorkspaceID != nil && *request.WorkspaceID != 0 {
		workspaceID = *request.WorkspaceID
	}

	clients := make([]map[string]any, 0, len(h.state.workspaceClients[workspaceID]))
	for _, client := range h.state.workspaceClients[workspaceID] {
		clients = append(clients, map[string]any{
			"id":           client.ID,
			"name":         client.Name,
			"workspace_id": client.WorkspaceID,
			"active":       client.Active,
		})
	}

	return WebResponse{
		StatusCode: 200,
		Body: map[string]any{
			"clients": clients,
		},
	}
}

// CreateClient accepts a minimal client payload for the caller's workspace.
func (h *WebTenantHandlers) CreateClient(ctx context.Context, sessionID string, request ClientCreateRequest) WebResponse {
	_ = ctx

	if request.WorkspaceID <= 0 || strings.TrimSpace(request.Name) == "" {
		return WebResponse{StatusCode: 400, Body: "invalid client payload"}
	}

	h.state.mu.Lock()
	defer h.state.mu.Unlock()

	userID, ok := h.state.sessions[sessionID]
	if !ok {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	user := h.state.users[userID]
	if user == nil {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	if user.DefaultWorkspaceID != 0 && user.DefaultWorkspaceID != request.WorkspaceID {
		return WebResponse{StatusCode: 403, Body: "User does not have access to this resource."}
	}

	client := clientRecord{
		ID:          h.state.nextClientID,
		WorkspaceID: request.WorkspaceID,
		Name:        strings.TrimSpace(request.Name),
		Active:      true,
	}
	h.state.nextClientID++
	h.state.workspaceClients[request.WorkspaceID] = append(h.state.workspaceClients[request.WorkspaceID], client)

	return WebResponse{
		StatusCode: 201,
		Body: map[string]any{
			"id":           client.ID,
			"name":         client.Name,
			"workspace_id": client.WorkspaceID,
			"active":       client.Active,
		},
	}
}

// ListTasks returns a simple tasks envelope based on the requested workspace.
func (h *WebTenantHandlers) ListTasks(ctx context.Context, sessionID string, request ListProjectsRequest) WebResponse {
	_ = ctx
	_ = sessionID

	h.state.mu.RLock()
	defer h.state.mu.RUnlock()

	workspaceID := int64(1)
	if request.WorkspaceID != nil && *request.WorkspaceID != 0 {
		workspaceID = *request.WorkspaceID
	}

	tasks := make([]map[string]any, 0, len(h.state.workspaceTasks[workspaceID]))
	for _, task := range h.state.workspaceTasks[workspaceID] {
		tasks = append(tasks, map[string]any{
			"id":           task.ID,
			"name":         task.Name,
			"workspace_id": task.WorkspaceID,
			"active":       task.Active,
		})
	}

	return WebResponse{
		StatusCode: 200,
		Body: map[string]any{
			"tasks": tasks,
		},
	}
}

// CreateTask accepts a minimal task payload for the caller's workspace.
func (h *WebTenantHandlers) CreateTask(ctx context.Context, sessionID string, request TaskCreateRequest) WebResponse {
	_ = ctx

	if request.WorkspaceID <= 0 || strings.TrimSpace(request.Name) == "" {
		return WebResponse{StatusCode: 400, Body: "invalid task payload"}
	}

	h.state.mu.Lock()
	defer h.state.mu.Unlock()

	userID, ok := h.state.sessions[sessionID]
	if !ok {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	user := h.state.users[userID]
	if user == nil {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	if user.DefaultWorkspaceID != 0 && user.DefaultWorkspaceID != request.WorkspaceID {
		return WebResponse{StatusCode: 403, Body: "User does not have access to this resource."}
	}

	task := taskRecord{
		ID:          h.state.nextTaskID,
		WorkspaceID: request.WorkspaceID,
		Name:        strings.TrimSpace(request.Name),
		Active:      true,
	}
	h.state.nextTaskID++
	h.state.workspaceTasks[request.WorkspaceID] = append(h.state.workspaceTasks[request.WorkspaceID], task)

	return WebResponse{
		StatusCode: 201,
		Body: map[string]any{
			"id":           task.ID,
			"name":         task.Name,
			"workspace_id": task.WorkspaceID,
			"active":       task.Active,
		},
	}
}

// ListTags returns a simple tags envelope based on the requested workspace.
func (h *WebTenantHandlers) ListTags(ctx context.Context, sessionID string, request ListProjectsRequest) WebResponse {
	_ = ctx
	_ = sessionID

	h.state.mu.RLock()
	defer h.state.mu.RUnlock()

	workspaceID := int64(1)
	if request.WorkspaceID != nil && *request.WorkspaceID != 0 {
		workspaceID = *request.WorkspaceID
	}

	tags := make([]map[string]any, 0, len(h.state.workspaceTags[workspaceID]))
	for _, tag := range h.state.workspaceTags[workspaceID] {
		tags = append(tags, map[string]any{
			"id":           tag.ID,
			"name":         tag.Name,
			"workspace_id": tag.WorkspaceID,
			"active":       tag.Active,
		})
	}

	return WebResponse{
		StatusCode: 200,
		Body: map[string]any{
			"tags": tags,
		},
	}
}

// CreateTag accepts a minimal tag payload for the caller's workspace.
func (h *WebTenantHandlers) CreateTag(ctx context.Context, sessionID string, request TagCreateRequest) WebResponse {
	_ = ctx

	if request.WorkspaceID <= 0 || strings.TrimSpace(request.Name) == "" {
		return WebResponse{StatusCode: 400, Body: "invalid tag payload"}
	}

	h.state.mu.Lock()
	defer h.state.mu.Unlock()

	userID, ok := h.state.sessions[sessionID]
	if !ok {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	user := h.state.users[userID]
	if user == nil {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	if user.DefaultWorkspaceID != 0 && user.DefaultWorkspaceID != request.WorkspaceID {
		return WebResponse{StatusCode: 403, Body: "User does not have access to this resource."}
	}

	tag := tagRecord{
		ID:          h.state.nextTagID,
		WorkspaceID: request.WorkspaceID,
		Name:        strings.TrimSpace(request.Name),
		Active:      true,
	}
	h.state.nextTagID++
	h.state.workspaceTags[request.WorkspaceID] = append(h.state.workspaceTags[request.WorkspaceID], tag)

	return WebResponse{
		StatusCode: 201,
		Body: map[string]any{
			"id":           tag.ID,
			"name":         tag.Name,
			"workspace_id": tag.WorkspaceID,
			"active":       tag.Active,
		},
	}
}

// ListGroups returns a simple groups envelope based on the requested workspace.
func (h *WebTenantHandlers) ListGroups(ctx context.Context, sessionID string, request ListProjectsRequest) WebResponse {
	_ = ctx
	_ = sessionID

	h.state.mu.RLock()
	defer h.state.mu.RUnlock()

	workspaceID := int64(1)
	if request.WorkspaceID != nil && *request.WorkspaceID != 0 {
		workspaceID = *request.WorkspaceID
	}

	groups := make([]map[string]any, 0, len(h.state.workspaceGroups[workspaceID]))
	for _, group := range h.state.workspaceGroups[workspaceID] {
		groups = append(groups, map[string]any{
			"id":           group.ID,
			"name":         group.Name,
			"workspace_id": group.WorkspaceID,
			"active":       group.Active,
		})
	}

	return WebResponse{
		StatusCode: 200,
		Body: map[string]any{
			"groups": groups,
		},
	}
}

// CreateGroup accepts a minimal group payload for the caller's workspace.
func (h *WebTenantHandlers) CreateGroup(ctx context.Context, sessionID string, request GroupCreateRequest) WebResponse {
	_ = ctx

	if request.WorkspaceID <= 0 || strings.TrimSpace(request.Name) == "" {
		return WebResponse{StatusCode: 400, Body: "invalid group payload"}
	}

	h.state.mu.Lock()
	defer h.state.mu.Unlock()

	userID, ok := h.state.sessions[sessionID]
	if !ok {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	user := h.state.users[userID]
	if user == nil {
		return WebResponse{StatusCode: 401, Body: "Unauthorized"}
	}
	if user.DefaultWorkspaceID != 0 && user.DefaultWorkspaceID != request.WorkspaceID {
		return WebResponse{StatusCode: 403, Body: "User does not have access to this resource."}
	}

	group := groupRecord{
		ID:          h.state.nextGroupID,
		WorkspaceID: request.WorkspaceID,
		Name:        strings.TrimSpace(request.Name),
		Active:      true,
	}
	h.state.nextGroupID++
	h.state.workspaceGroups[request.WorkspaceID] = append(h.state.workspaceGroups[request.WorkspaceID], group)

	return WebResponse{
		StatusCode: 201,
		Body: map[string]any{
			"id":           group.ID,
			"name":         group.Name,
			"workspace_id": group.WorkspaceID,
			"active":       group.Active,
		},
	}
}
