package application

import "time"

type Query struct {
	EndDate     time.Time
	RequestedBy int64
	StartDate   time.Time
	Timezone    string
	WorkspaceID int64
}

type WeeklyRow struct {
	BillableSeconds []int
	ClientName      string
	ProjectID       int64
	ProjectName     string
	Seconds         []int
	UserID          int64
	UserName        string
}

type WeeklyReport struct {
	Rows            []WeeklyRow
	TotalSeconds    int
	TrackedDays     int
	TrackedWeekdays []time.Time
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
