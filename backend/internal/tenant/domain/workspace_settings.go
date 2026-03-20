package domain

import (
	"fmt"
	"strings"
)

type WorkspaceRoundingMode int

const (
	WorkspaceRoundingDown    WorkspaceRoundingMode = -1
	WorkspaceRoundingNearest WorkspaceRoundingMode = 0
	WorkspaceRoundingUp      WorkspaceRoundingMode = 1
)

type WorkspaceDisplayPolicy string

const (
	WorkspaceDisplayPolicyStandard          WorkspaceDisplayPolicy = "standard"
	WorkspaceDisplayPolicyHideStartEndTimes WorkspaceDisplayPolicy = "hide_start_end_times"
)

type WorkspacePublicProjectAccess string

const (
	WorkspacePublicProjectAccessMembers WorkspacePublicProjectAccess = "members"
	WorkspacePublicProjectAccessAdmins  WorkspacePublicProjectAccess = "admins"
)

type WorkspaceSettingsInput struct {
	DefaultCurrency             string
	DefaultHourlyRate           float64
	Rounding                    WorkspaceRoundingMode
	RoundingMinutes             int
	DisplayPolicy               WorkspaceDisplayPolicy
	OnlyAdminsMayCreateProjects bool
	OnlyAdminsSeeTeamDashboard  bool
	ProjectsBillableByDefault   bool
	ReportsCollapse             bool
	PublicProjectAccess         WorkspacePublicProjectAccess
}

type WorkspaceSettings struct {
	defaultCurrency             string
	defaultHourlyRate           float64
	rounding                    WorkspaceRoundingMode
	roundingMinutes             int
	displayPolicy               WorkspaceDisplayPolicy
	onlyAdminsMayCreateProjects bool
	onlyAdminsSeeTeamDashboard  bool
	projectsBillableByDefault   bool
	reportsCollapse             bool
	publicProjectAccess         WorkspacePublicProjectAccess
}

func NewWorkspaceSettings(input WorkspaceSettingsInput) (WorkspaceSettings, error) {
	defaultCurrency := strings.TrimSpace(input.DefaultCurrency)
	if defaultCurrency == "" {
		defaultCurrency = "USD"
	}
	if input.DefaultHourlyRate < 0 {
		return WorkspaceSettings{}, fmt.Errorf("default hourly rate must be zero or positive")
	}
	if input.Rounding != WorkspaceRoundingDown &&
		input.Rounding != WorkspaceRoundingNearest &&
		input.Rounding != WorkspaceRoundingUp {
		return WorkspaceSettings{}, fmt.Errorf("rounding must be -1, 0, or 1")
	}
	if input.RoundingMinutes < 0 {
		return WorkspaceSettings{}, fmt.Errorf("rounding minutes must be zero or positive")
	}
	if input.Rounding != WorkspaceRoundingNearest && input.RoundingMinutes == 0 {
		return WorkspaceSettings{}, fmt.Errorf("rounding minutes are required when rounding direction is explicit")
	}

	displayPolicy := input.DisplayPolicy
	if displayPolicy == "" {
		displayPolicy = WorkspaceDisplayPolicyStandard
	}
	if displayPolicy != WorkspaceDisplayPolicyStandard && displayPolicy != WorkspaceDisplayPolicyHideStartEndTimes {
		return WorkspaceSettings{}, fmt.Errorf("workspace display policy %q is not supported", displayPolicy)
	}

	publicProjectAccess := input.PublicProjectAccess
	if publicProjectAccess == "" {
		publicProjectAccess = WorkspacePublicProjectAccessMembers
	}
	if publicProjectAccess != WorkspacePublicProjectAccessMembers &&
		publicProjectAccess != WorkspacePublicProjectAccessAdmins {
		return WorkspaceSettings{}, fmt.Errorf("workspace public project access %q is not supported", publicProjectAccess)
	}

	return WorkspaceSettings{
		defaultCurrency:             defaultCurrency,
		defaultHourlyRate:           input.DefaultHourlyRate,
		rounding:                    input.Rounding,
		roundingMinutes:             input.RoundingMinutes,
		displayPolicy:               displayPolicy,
		onlyAdminsMayCreateProjects: input.OnlyAdminsMayCreateProjects,
		onlyAdminsSeeTeamDashboard:  input.OnlyAdminsSeeTeamDashboard,
		projectsBillableByDefault:   input.ProjectsBillableByDefault,
		reportsCollapse:             input.ReportsCollapse,
		publicProjectAccess:         publicProjectAccess,
	}, nil
}

func DefaultWorkspaceSettings() WorkspaceSettings {
	settings, err := NewWorkspaceSettings(WorkspaceSettingsInput{})
	if err != nil {
		panic(err)
	}
	return settings
}

func (settings WorkspaceSettings) DefaultCurrency() string {
	return settings.defaultCurrency
}

func (settings WorkspaceSettings) DefaultHourlyRate() float64 {
	return settings.defaultHourlyRate
}

func (settings WorkspaceSettings) Rounding() WorkspaceRoundingMode {
	return settings.rounding
}

func (settings WorkspaceSettings) RoundingMinutes() int {
	return settings.roundingMinutes
}

func (settings WorkspaceSettings) DisplayPolicy() WorkspaceDisplayPolicy {
	return settings.displayPolicy
}

func (settings WorkspaceSettings) OnlyAdminsMayCreateProjects() bool {
	return settings.onlyAdminsMayCreateProjects
}

func (settings WorkspaceSettings) OnlyAdminsSeeTeamDashboard() bool {
	return settings.onlyAdminsSeeTeamDashboard
}

func (settings WorkspaceSettings) ProjectsBillableByDefault() bool {
	return settings.projectsBillableByDefault
}

func (settings WorkspaceSettings) ReportsCollapse() bool {
	return settings.reportsCollapse
}

func (settings WorkspaceSettings) PublicProjectAccess() WorkspacePublicProjectAccess {
	return settings.publicProjectAccess
}
