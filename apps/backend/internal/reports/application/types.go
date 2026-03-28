package application

import "time"

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
