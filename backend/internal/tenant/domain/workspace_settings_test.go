package domain

import "testing"

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

func TestNewWorkspaceSettingsBuildsCompatVisibleFields(t *testing.T) {
	settings, err := NewWorkspaceSettings(WorkspaceSettingsInput{
		DefaultCurrency:             "EUR",
		DefaultHourlyRate:           99.5,
		Rounding:                    WorkspaceRoundingNearest,
		RoundingMinutes:             15,
		DisplayPolicy:               WorkspaceDisplayPolicyHideStartEndTimes,
		OnlyAdminsMayCreateProjects: true,
		OnlyAdminsSeeTeamDashboard:  true,
		ProjectsBillableByDefault:   true,
		ReportsCollapse:             false,
		PublicProjectAccess:         WorkspacePublicProjectAccessAdmins,
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
}
