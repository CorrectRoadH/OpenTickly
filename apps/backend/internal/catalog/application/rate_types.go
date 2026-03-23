package application

import "time"

type RateType string

const (
	RateTypeBillable  RateType = "billable_rates"
	RateTypeLaborCost RateType = "labor_costs"
)

type RateLevel string

const (
	RateLevelWorkspace     RateLevel = "workspace"
	RateLevelWorkspaceUser RateLevel = "workspace_user"
	RateLevelProject       RateLevel = "project"
	RateLevelProjectUser   RateLevel = "project_user"
	RateLevelTask          RateLevel = "task"
)

type RateChangeMode string

const (
	RateChangeModeOverrideAll     RateChangeMode = "override-all"
	RateChangeModeOverrideCurrent RateChangeMode = "override-current"
	RateChangeModeStartToday      RateChangeMode = "start-today"
)

type RateView struct {
	ID              int64
	WorkspaceID     int64
	Type            RateType
	Level           RateLevel
	LevelID         int64
	Amount          float64
	CreatorID       *int64
	Start           time.Time
	End             *time.Time
	RateChangeMode  RateChangeMode
	CreatedAt       time.Time
	UpdatedAt       time.Time
	ProjectID       *int64
	ProjectUserID   *int64
	PlannedTaskID   *int64
	WorkspaceUserID *int64
}

type CreateRateCommand struct {
	WorkspaceID int64
	CreatorID   int64
	Level       RateLevel
	LevelID     int64
	Type        RateType
	Amount      float64
	Mode        *RateChangeMode
	Start       *time.Time
}
