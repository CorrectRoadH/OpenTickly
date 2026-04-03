package application

import (
	"encoding/json"
	"time"
)

type Query struct {
	Description string
	EndDate     time.Time
	ProjectIDs  []int64
	RequestedBy int64
	StartDate   time.Time
	TagIDs      []int64
	TaskIDs     []int64
	Timezone    string
	WorkspaceID int64
}

type WeeklyRow struct {
	BillableAmountsInCents []int
	BillableSeconds        []int
	ClientName             string
	Currency               string
	HourlyRateInCents      int
	ProjectID              int64
	ProjectName            string
	Seconds                []int
	UserID                 int64
	UserName               string
}

type WeeklyReport struct {
	BillableAmountInCents int
	Rows                  []WeeklyRow
	TotalSeconds          int
	TrackedDays           int
	TrackedWeekdays       []time.Time
}

type SummarySubGroup struct {
	BillableSeconds int
	Label           string
	Seconds         int
	UserID          int64
}

type SummaryGroup struct {
	BillableSeconds int
	Label           string
	ProjectID       int64
	Seconds         int
	SubGroups       []SummarySubGroup
}

type SummaryReport struct {
	Groups       []SummaryGroup
	TotalSeconds int
	TrackedDays  int
}

// SavedReportView is the read model for a persisted report definition.
type SavedReportView struct {
	ID             int64
	WorkspaceID    int64
	Name           string
	Public         bool
	FixedDateRange bool
	Token          *string
	Params         json.RawMessage
	CreatedBy      int64
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type CreateSavedReportCommand struct {
	WorkspaceID    int64
	Name           string
	Public         bool
	FixedDateRange bool
	Params         json.RawMessage
	CreatedBy      int64
}

type UpdateSavedReportCommand struct {
	ID             int64
	WorkspaceID    int64
	Name           string
	Public         bool
	FixedDateRange bool
	Params         json.RawMessage
}

// ScheduledReportView is the read model for a scheduled report delivery.
type ScheduledReportView struct {
	ID          int64
	WorkspaceID int64
	ReportID    int64
	Frequency   int
	CreatorID   int64
	UserIDs     []int64
	GroupIDs    []int64
	CreatedAt   time.Time
}

type CreateScheduledReportCommand struct {
	WorkspaceID int64
	ReportID    int64
	Frequency   int
	CreatorID   int64
	UserIDs     []int64
	GroupIDs    []int64
}
