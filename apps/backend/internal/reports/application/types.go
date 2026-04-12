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
	// NoProject filters for entries with no project assigned. When combined
	// with ProjectIDs, semantics are OR: entries without a project OR whose
	// project is in the list (Toggl "[null]" filter convention).
	NoProject bool
	// NoTag filters for entries with no tags assigned (OR-combined with TagIDs).
	NoTag bool
	// NoTask filters for entries with no task assigned (OR-combined with TaskIDs).
	NoTask bool
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

// ---------------------------------------------------------------------------
// Insights: Data Trends
// ---------------------------------------------------------------------------

// ProjectDataTrendsQuery is the input for the data trends endpoint.
type ProjectDataTrendsQuery struct {
	WorkspaceID         int64
	RequestedBy         int64
	Timezone            string
	StartDate           time.Time
	EndDate             time.Time
	PreviousPeriodStart *time.Time
	ProjectIDs          []int64
	Billable            *bool
}

// ProjectDataTrend is the result for a single project in the data trends response.
type ProjectDataTrend struct {
	ProjectID             int64
	CurrentPeriodSeconds  []int
	PreviousPeriodSeconds []int
	UserIDs               []int64
	Start                 time.Time
	End                   time.Time
	PreviousStart         *time.Time
}

// ---------------------------------------------------------------------------
// Insights: Profitability
// ---------------------------------------------------------------------------

// ProjectProfitabilityQuery is the input for the project profitability endpoint.
type ProjectProfitabilityQuery struct {
	WorkspaceID int64
	RequestedBy int64
	Timezone    string
	StartDate   time.Time
	EndDate     time.Time
	ProjectIDs  []int64
	ClientIDs   []int64
	Billable    *bool
	Currency    string
}

// ProjectProfitabilityRow is the result for a single project.
type ProjectProfitabilityRow struct {
	ProjectID       int64
	ProjectName     string
	ProjectColor    string
	TotalSeconds    int
	BillableSeconds int
	Earnings        int
	Currency        string
}

// EmployeeProfitabilityQuery is the input for the employee profitability endpoint.
type EmployeeProfitabilityQuery struct {
	WorkspaceID int64
	RequestedBy int64
	Timezone    string
	StartDate   time.Time
	EndDate     time.Time
	UserIDs     []int64
	GroupIDs    []int64
	Currency    string
}

// EmployeeProfitabilityRow is the result for a single employee.
type EmployeeProfitabilityRow struct {
	UserID          int64
	UserName        string
	TotalSeconds    int
	BillableSeconds int
	Earnings        int
	Currency        string
}
