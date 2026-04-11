package domain

import (
	"testing"

	"github.com/samber/lo"
)

func TestNewWorkspaceSettingsRejectsUnsupportedRoundingMode(t *testing.T) {
	_, err := NewWorkspaceSettings(WorkspaceSettingsInput{
		DefaultCurrency:     "USD",
		DefaultHourlyRate:   150,
		Rounding:            2,
		RoundingMinutes:     15,
		DisplayPolicy:       WorkspaceDisplayPolicyStandard,
		ReportsCollapse:     true,
		PublicProjectAccess: WorkspacePublicProjectAccessMembers,
	})
	if err == nil {
		t.Fatal("expected unsupported rounding mode to be rejected")
	}
}

func TestNewWorkspaceSettingsRequiresMinutesForExplicitRoundingDirection(t *testing.T) {
	_, err := NewWorkspaceSettings(WorkspaceSettingsInput{
		DefaultCurrency:     "USD",
		DefaultHourlyRate:   150,
		Rounding:            WorkspaceRoundingUp,
		RoundingMinutes:     0,
		DisplayPolicy:       WorkspaceDisplayPolicyStandard,
		ReportsCollapse:     true,
		PublicProjectAccess: WorkspacePublicProjectAccessMembers,
	})
	if err == nil {
		t.Fatal("expected explicit rounding direction without minutes to be rejected")
	}
}

// TestNewWorkspaceSettingsRejectsNegativeHourlyRate verifies that a negative
// default hourly rate is rejected. Rates must be zero or positive — negative
// rates would produce nonsensical billing calculations.
func TestNewWorkspaceSettingsRejectsNegativeHourlyRate(t *testing.T) {
	_, err := NewWorkspaceSettings(WorkspaceSettingsInput{
		DefaultHourlyRate: -10,
	})
	if err == nil {
		t.Fatal("expected negative hourly rate to be rejected")
	}
}

// TestNewWorkspaceSettingsRejectsNegativeRoundingMinutes verifies that
// negative rounding minutes are rejected. Negative values would invert
// the rounding direction logic.
func TestNewWorkspaceSettingsRejectsNegativeRoundingMinutes(t *testing.T) {
	_, err := NewWorkspaceSettings(WorkspaceSettingsInput{
		Rounding:        WorkspaceRoundingNearest,
		RoundingMinutes: -5,
	})
	if err == nil {
		t.Fatal("expected negative rounding minutes to be rejected")
	}
}

// TestNewWorkspaceSettingsDefaultsEmptyCurrencyToUSD verifies that an empty
// currency string defaults to "USD". Toggl's API requires a currency value
// and USD is the conventional default.
func TestNewWorkspaceSettingsDefaultsEmptyCurrencyToUSD(t *testing.T) {
	settings, err := NewWorkspaceSettings(WorkspaceSettingsInput{
		DefaultCurrency: "",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if settings.DefaultCurrency() != "USD" {
		t.Fatalf("expected default currency USD, got %q", settings.DefaultCurrency())
	}
}

// TestNewWorkspaceSettingsRejectsUnsupportedDisplayPolicy verifies that
// unknown display policy values are rejected. Only "standard" and
// "hide_start_end_times" are valid — accepting arbitrary strings would
// cause undefined frontend behavior.
func TestNewWorkspaceSettingsRejectsUnsupportedDisplayPolicy(t *testing.T) {
	_, err := NewWorkspaceSettings(WorkspaceSettingsInput{
		DisplayPolicy: "invalid_policy",
	})
	if err == nil {
		t.Fatal("expected unsupported display policy to be rejected")
	}
}

// TestNewWorkspaceSettingsDefaultsEmptyDisplayPolicyToStandard verifies that
// an empty display policy defaults to "standard".
func TestNewWorkspaceSettingsDefaultsEmptyDisplayPolicyToStandard(t *testing.T) {
	settings, err := NewWorkspaceSettings(WorkspaceSettingsInput{
		DisplayPolicy: "",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if settings.DisplayPolicy() != WorkspaceDisplayPolicyStandard {
		t.Fatalf("expected default display policy standard, got %q", settings.DisplayPolicy())
	}
}

// TestNewWorkspaceSettingsRejectsUnsupportedPublicProjectAccess verifies
// that unknown public project access values are rejected. Only "members"
// and "admins" are valid.
func TestNewWorkspaceSettingsRejectsUnsupportedPublicProjectAccess(t *testing.T) {
	_, err := NewWorkspaceSettings(WorkspaceSettingsInput{
		PublicProjectAccess: "everyone",
	})
	if err == nil {
		t.Fatal("expected unsupported public project access to be rejected")
	}
}

// TestNewWorkspaceSettingsDefaultsEmptyPublicProjectAccessToMembers verifies
// that an empty public project access defaults to "members".
func TestNewWorkspaceSettingsDefaultsEmptyPublicProjectAccessToMembers(t *testing.T) {
	settings, err := NewWorkspaceSettings(WorkspaceSettingsInput{
		PublicProjectAccess: "",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if settings.PublicProjectAccess() != WorkspacePublicProjectAccessMembers {
		t.Fatalf("expected default public project access members, got %q", settings.PublicProjectAccess())
	}
}

// TestNewWorkspaceSettingsDefaultsNilShowTimesheetViewToTrue verifies that
// a nil ShowTimesheetView defaults to true. The timesheet view should be
// visible by default for new workspaces.
func TestNewWorkspaceSettingsDefaultsNilShowTimesheetViewToTrue(t *testing.T) {
	settings, err := NewWorkspaceSettings(WorkspaceSettingsInput{
		ShowTimesheetView: nil,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !settings.ShowTimesheetView() {
		t.Fatal("expected nil ShowTimesheetView to default to true")
	}
}

// TestNewWorkspaceSettingsDeduplicatesRequiredTimeEntryFields verifies that
// duplicate and whitespace-only entries in RequiredTimeEntryFields are
// normalized. Duplicates would cause redundant validation; empty strings
// would match everything.
func TestNewWorkspaceSettingsDeduplicatesRequiredTimeEntryFields(t *testing.T) {
	settings, err := NewWorkspaceSettings(WorkspaceSettingsInput{
		RequiredTimeEntryFields: []string{"project", "  project  ", "task", "", "  ", "task"},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	fields := settings.RequiredTimeEntryFields()
	if len(fields) != 2 {
		t.Fatalf("expected 2 deduplicated fields, got %d: %v", len(fields), fields)
	}
	if fields[0] != "project" || fields[1] != "task" {
		t.Fatalf("expected [project, task], got %v", fields)
	}
}

// TestDefaultWorkspaceSettingsReturnsConventionalDefaults verifies that
// DefaultWorkspaceSettings() produces the expected factory defaults.
func TestDefaultWorkspaceSettingsReturnsConventionalDefaults(t *testing.T) {
	settings := DefaultWorkspaceSettings()

	if settings.DefaultCurrency() != "USD" {
		t.Fatalf("expected default currency USD, got %q", settings.DefaultCurrency())
	}
	if settings.DefaultHourlyRate() != 0 {
		t.Fatalf("expected default hourly rate 0, got %v", settings.DefaultHourlyRate())
	}
	if settings.Rounding() != WorkspaceRoundingNearest {
		t.Fatalf("expected default rounding nearest, got %d", settings.Rounding())
	}
	if settings.DisplayPolicy() != WorkspaceDisplayPolicyStandard {
		t.Fatalf("expected default display policy standard, got %q", settings.DisplayPolicy())
	}
	if settings.PublicProjectAccess() != WorkspacePublicProjectAccessMembers {
		t.Fatalf("expected default public project access members, got %q", settings.PublicProjectAccess())
	}
	if !settings.ShowTimesheetView() {
		t.Fatal("expected default show timesheet view true")
	}
	if settings.OnlyAdminsMayCreateProjects() {
		t.Fatal("expected default only_admins_may_create_projects false")
	}
	if settings.OnlyAdminsMayCreateTags() {
		t.Fatal("expected default only_admins_may_create_tags false")
	}
	if settings.OnlyAdminsSeeTeamDashboard() {
		t.Fatal("expected default only_admins_see_team_dashboard false")
	}
	if settings.ProjectsBillableByDefault() {
		t.Fatal("expected default projects_billable_by_default false")
	}
	if settings.ProjectsPrivateByDefault() {
		t.Fatal("expected default projects_private_by_default false")
	}
	if settings.ProjectsEnforceBillable() {
		t.Fatal("expected default projects_enforce_billable false")
	}
	if len(settings.RequiredTimeEntryFields()) != 0 {
		t.Fatalf("expected default empty required fields, got %v", settings.RequiredTimeEntryFields())
	}
}

func TestNewWorkspaceSettingsBuildsCompatVisibleFields(t *testing.T) {
	settings, err := NewWorkspaceSettings(WorkspaceSettingsInput{
		DefaultCurrency:             "EUR",
		DefaultHourlyRate:           99.5,
		Rounding:                    WorkspaceRoundingNearest,
		RoundingMinutes:             15,
		DisplayPolicy:               WorkspaceDisplayPolicyHideStartEndTimes,
		OnlyAdminsMayCreateProjects: true,
		OnlyAdminsMayCreateTags:     true,
		OnlyAdminsSeeTeamDashboard:  true,
		ProjectsBillableByDefault:   true,
		ProjectsPrivateByDefault:    true,
		ProjectsEnforceBillable:     true,
		ReportsCollapse:             false,
		PublicProjectAccess:         WorkspacePublicProjectAccessAdmins,
		ReportLockedAt:              "2026-03-20T00:00:00Z",
		ShowTimesheetView:           lo.ToPtr(false),
		RequiredTimeEntryFields:     []string{"project", "task"},
	})
	if err != nil {
		t.Fatalf("expected valid settings input: %v", err)
	}

	if settings.DefaultCurrency() != "EUR" {
		t.Fatalf("expected currency EUR, got %q", settings.DefaultCurrency())
	}
	if settings.DefaultHourlyRate() != 99.5 {
		t.Fatalf("expected hourly rate 99.5, got %v", settings.DefaultHourlyRate())
	}
	if settings.Rounding() != WorkspaceRoundingNearest {
		t.Fatalf("expected nearest rounding, got %d", settings.Rounding())
	}
	if settings.RoundingMinutes() != 15 {
		t.Fatalf("expected 15 rounding minutes, got %d", settings.RoundingMinutes())
	}
	if settings.DisplayPolicy() != WorkspaceDisplayPolicyHideStartEndTimes {
		t.Fatalf("expected hide-start-end-times display policy, got %q", settings.DisplayPolicy())
	}
	if settings.PublicProjectAccess() != WorkspacePublicProjectAccessAdmins {
		t.Fatalf("expected admins-only public project access, got %q", settings.PublicProjectAccess())
	}
	if !settings.OnlyAdminsMayCreateProjects() {
		t.Fatal("expected only_admins_may_create_projects true")
	}
	if !settings.OnlyAdminsMayCreateTags() {
		t.Fatal("expected only_admins_may_create_tags true")
	}
	if !settings.OnlyAdminsSeeTeamDashboard() {
		t.Fatal("expected only_admins_see_team_dashboard true")
	}
	if !settings.ProjectsBillableByDefault() {
		t.Fatal("expected projects_billable_by_default true")
	}
	if !settings.ProjectsPrivateByDefault() {
		t.Fatal("expected projects_private_by_default true")
	}
	if !settings.ProjectsEnforceBillable() {
		t.Fatal("expected projects_enforce_billable true")
	}
	if settings.ReportLockedAt() != "2026-03-20T00:00:00Z" {
		t.Fatalf("expected report_locked_at, got %q", settings.ReportLockedAt())
	}
	if settings.ShowTimesheetView() {
		t.Fatal("expected show_timesheet_view false")
	}
	if settings.HideStartEndTimes() != true {
		t.Fatal("expected HideStartEndTimes true")
	}
	fields := settings.RequiredTimeEntryFields()
	if len(fields) != 2 || fields[0] != "project" || fields[1] != "task" {
		t.Fatalf("expected required fields [project, task], got %v", fields)
	}
}
