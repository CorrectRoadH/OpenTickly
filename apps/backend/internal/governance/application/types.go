package application

import (
	"context"
	"errors"
	"time"
)

var (
	ErrStoreRequired          = errors.New("governance store is required")
	ErrInvalidOrganization    = errors.New("governance organization id must be positive")
	ErrInvalidWorkspace       = errors.New("governance workspace id must be positive")
	ErrInvalidAuditLogWindow  = errors.New("governance audit log window is invalid")
	ErrAlertNotFound          = errors.New("governance alert not found")
	ErrTimesheetSetupNotFound = errors.New("governance timesheet setup not found")
	ErrTimesheetNotFound      = errors.New("governance timesheet not found")
	ErrInvalidTimesheetDate   = errors.New("governance timesheet date is invalid")
)

type AuditLogView struct {
	ID             int64
	OrganizationID int64
	WorkspaceID    *int64
	EntityType     string
	EntityID       *int64
	Action         string
	UserID         *int64
	CreatedAt      time.Time
}

type ListAuditLogsFilter struct {
	From        time.Time
	To          time.Time
	Export      bool
	WorkspaceID *int64
	EntityType  string
	EntityID    *int64
	Action      string
	UserID      *int64
	PageSize    int
	PageNumber  int
}

type TimeEntryConstraintsView struct {
	WorkspaceID                 int64
	DescriptionPresent          bool
	ProjectPresent              bool
	TagPresent                  bool
	TaskPresent                 bool
	TimeEntryConstraintsEnabled bool
}

type AlertView struct {
	ID                int64
	WorkspaceID       int64
	ProjectID         *int64
	ProjectName       *string
	ClientID          *int64
	ClientName        *string
	ReceiverRoles     []string
	ReceiverUsers     []int64
	ReceiverUsersName []string
	SourceKind        string
	ThresholdType     string
	Thresholds        []int
}

type SaveAlertCommand struct {
	WorkspaceID   int64
	AlertID       *int64
	ProjectID     *int64
	ReceiverRoles []string
	ReceiverUsers []int64
	SourceKind    string
	ThresholdType string
	Thresholds    []int
}

type TimesheetSetupView struct {
	ID                   int64
	WorkspaceID          int64
	MemberUserID         int64
	MemberName           string
	ApproverUserID       *int64
	ApproverName         *string
	ApproverUserIDs      []int64
	ApproverLayers       map[string][]int64
	Periodicity          string
	ReminderDay          int
	ReminderTime         string
	EmailReminderEnabled bool
	SlackReminderEnabled bool
	StartDate            time.Time
	EndDate              *time.Time
	CreatedAt            time.Time
	UpdatedAt            time.Time
	KnownUserNames       map[int64]string
}

type ListTimesheetSetupsFilter struct {
	MemberUserIDs   []int64
	ApproverUserIDs []int64
	SortField       string
	SortOrder       string
}

type CreateTimesheetSetupCommand struct {
	WorkspaceID          int64
	MemberUserIDs        []int64
	ApproverUserID       *int64
	ApproverUserIDs      []int64
	ApproverLayers       map[string][]int64
	Periodicity          string
	ReminderDay          int
	ReminderTime         string
	EmailReminderEnabled bool
	SlackReminderEnabled bool
	StartDate            time.Time
}

type UpdateTimesheetSetupCommand struct {
	WorkspaceID          int64
	SetupID              int64
	ApproverUserID       *int64
	ApproverUserIDs      []int64
	ApproverLayers       map[string][]int64
	ReminderDay          *int
	ReminderTime         *string
	EmailReminderEnabled *bool
	SlackReminderEnabled *bool
	EndDate              *time.Time
}

type TimesheetReviewView struct {
	Approved         *bool
	ForceApproved    bool
	Name             string
	ReviewLayer      int
	RejectionComment string
	UpdatedAt        time.Time
	UserID           int64
}

type TimesheetView struct {
	ID                    int64
	WorkspaceID           int64
	TimesheetSetupID      int64
	MemberUserID          int64
	MemberName            string
	ApproverUserID        *int64
	ApproverName          *string
	ApproverUserIDs       []int64
	ApproverLayers        map[string][]int64
	Periodicity           string
	PeriodStart           time.Time
	PeriodEnd             time.Time
	StartDate             time.Time
	EndDate               time.Time
	Status                string
	ForceApproved         bool
	RejectionComment      string
	ReviewLayer           int
	SubmittedAt           *time.Time
	ApprovedOrRejectedAt  *time.Time
	ApprovedOrRejectedID  *int64
	ReminderDay           int
	ReminderTime          string
	ReminderSentAt        *time.Time
	WorkingHoursInMinutes int
	Timezone              string
	CreatedAt             time.Time
	UpdatedAt             time.Time
	Reviews               []TimesheetReviewView
	KnownUserNames        map[int64]string
}

type ListTimesheetsFilter struct {
	MemberUserIDs     []int64
	ApproverUserIDs   []int64
	TimesheetSetupIDs []int64
	Statuses          []string
	After             *time.Time
	Before            *time.Time
	Page              int
	PerPage           int
	SortField         string
	SortOrder         string
}

type UpdateTimesheetCommand struct {
	WorkspaceID      int64
	RequesterUserID  int64
	TimesheetSetupID int64
	StartDate        time.Time
	Status           string
	ForceApproved    *bool
	RejectionComment *string
}

type TimesheetHoursView struct {
	StartDate             time.Time
	TimesheetSetupID      int64
	TotalSeconds          int
	WorkingHoursInMinutes int
}

type TimelineEventView struct {
	ID        int64
	UserID    int64
	DesktopID string
	Filename  string
	Title     string
	StartTime int
	EndTime   int
	Idle      bool
}

type Store interface {
	ListAuditLogs(context.Context, int64, ListAuditLogsFilter) ([]AuditLogView, error)
	GetTimeEntryConstraints(context.Context, int64) (TimeEntryConstraintsView, error)
	SaveTimeEntryConstraints(context.Context, TimeEntryConstraintsView) error

	ListAlerts(context.Context, int64) ([]AlertView, error)
	SaveAlert(context.Context, SaveAlertCommand) (AlertView, error)
	DeleteAlert(context.Context, int64, int64) error

	ListTimesheetSetups(context.Context, int64, ListTimesheetSetupsFilter) ([]TimesheetSetupView, error)
	GetTimesheetSetup(context.Context, int64, int64) (TimesheetSetupView, bool, error)
	CreateTimesheetSetups(context.Context, CreateTimesheetSetupCommand) ([]TimesheetSetupView, error)
	UpdateTimesheetSetup(context.Context, UpdateTimesheetSetupCommand) (TimesheetSetupView, error)
	DeleteTimesheetSetup(context.Context, int64, int64) error

	ListStoredTimesheets(context.Context, int64, []int64, *time.Time, *time.Time) ([]TimesheetView, error)
	SaveTimesheet(context.Context, TimesheetView) (TimesheetView, error)
	ListPeriodTimeEntries(context.Context, int64, int64, time.Time, time.Time) ([]TrackedTimeEntryView, error)
}

type TrackedTimeEntryView struct {
	ID          int64
	WorkspaceID int64
	UserID      int64
	ClientID    *int64
	ClientName  *string
	ProjectID   *int64
	ProjectName *string
	TaskID      *int64
	TaskName    *string
	Description string
	Billable    bool
	Start       time.Time
	Stop        *time.Time
	Duration    int
	CreatedAt   time.Time
	UpdatedAt   time.Time
	TagIDs      []int64
	TagNames    []string
	ExpenseIDs  []int64
}
