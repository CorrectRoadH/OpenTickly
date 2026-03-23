package application

import (
	"context"
	"errors"
	"time"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
)

var (
	ErrStoreRequired          = errors.New("tracking store is required")
	ErrCatalogQueriesRequired = errors.New("tracking catalog queries are required")
	ErrInvalidWorkspace       = errors.New("tracking workspace id must be positive")
	ErrTimeEntryNotFound      = errors.New("tracking time entry not found")
	ErrRunningTimeEntryExists = errors.New("tracking running time entry already exists")
	ErrFavoriteNotFound       = errors.New("tracking favorite not found")
	ErrGoalNotFound           = errors.New("tracking goal not found")
	ErrReminderNotFound       = errors.New("tracking reminder not found")
	ErrExpenseNotFound        = errors.New("tracking expense not found")
	ErrInvalidTimeRange       = errors.New("tracking time entry values are inconsistent")
)

type TimeEntryView struct {
	ID            int64
	WorkspaceID   int64
	UserID        int64
	ClientID      *int64
	ProjectID     *int64
	TaskID        *int64
	Description   string
	Billable      bool
	Start         time.Time
	Stop          *time.Time
	Duration      int
	CreatedWith   string
	TagIDs        []int64
	ExpenseIDs    []int64
	DeletedAt     *time.Time
	CreatedAt     time.Time
	UpdatedAt     time.Time
	ClientName    *string
	ProjectName   *string
	TaskName      *string
	ProjectActive *bool
}

type ProjectStatisticsView struct {
	EarliestTimeEntry *time.Time
	LatestTimeEntry   *time.Time
}

type ListTimeEntriesFilter struct {
	UserID     int64
	Since      *time.Time
	Before     *time.Time
	StartDate  *time.Time
	EndDate    *time.Time
	IncludeAll bool
}

type CreateTimeEntryCommand struct {
	WorkspaceID int64
	UserID      int64
	Billable    bool
	Description string
	Start       time.Time
	Stop        *time.Time
	Duration    *int
	CreatedWith string
	ProjectID   *int64
	TaskID      *int64
	TagIDs      []int64
}

type UpdateTimeEntryCommand struct {
	WorkspaceID int64
	TimeEntryID int64
	UserID      int64
	Billable    *bool
	Description *string
	Start       *time.Time
	Stop        *time.Time
	Duration    *int
	ProjectID   *int64
	TaskID      *int64
	TagIDs      []int64
	ReplaceTags bool
}

type TimeEntryPatch struct {
	Op    string
	Path  string
	Value any
}

type FavoriteView struct {
	ID          int64
	WorkspaceID int64
	UserID      int64
	ProjectID   *int64
	TaskID      *int64
	Description string
	Billable    bool
	Public      bool
	Rank        int
	TagIDs      []int64
	DeletedAt   *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type UpsertFavoriteCommand struct {
	WorkspaceID int64
	UserID      int64
	FavoriteID  *int64
	ProjectID   *int64
	TaskID      *int64
	Description *string
	Billable    *bool
	Public      *bool
	Rank        *int
	TagIDs      []int64
	ReplaceTags bool
}

type GoalView struct {
	ID            int64
	WorkspaceID   int64
	UserID        int64
	CreatorUserID int64
	Name          string
	Active        bool
	Billable      bool
	Comparison    string
	Recurrence    string
	Icon          string
	TargetSeconds int
	StartDate     time.Time
	EndDate       *time.Time
	ProjectIDs    []int64
	TaskIDs       []int64
	TagIDs        []int64
	DeletedAt     *time.Time
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type CreateGoalCommand struct {
	WorkspaceID   int64
	UserID        int64
	CreatorUserID int64
	Name          string
	Billable      bool
	Comparison    string
	Recurrence    string
	Icon          string
	TargetSeconds int
	StartDate     time.Time
	EndDate       *time.Time
	ProjectIDs    []int64
	TaskIDs       []int64
	TagIDs        []int64
}

type UpdateGoalCommand struct {
	WorkspaceID   int64
	GoalID        int64
	UserID        int64
	Active        *bool
	Name          *string
	Comparison    *string
	Icon          *string
	TargetSeconds *int
	EndDate       *time.Time
}

type ListGoalsFilter struct {
	UserID   int64
	Active   *bool
	Page     int
	PerPage  int
	TeamGoal bool
}

type ReminderView struct {
	ID                   int64
	WorkspaceID          int64
	Frequency            int
	ThresholdHours       float64
	EmailReminderEnabled bool
	SlackReminderEnabled bool
	UserIDs              []int64
	GroupIDs             []int64
	DeletedAt            *time.Time
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

type UpsertReminderCommand struct {
	WorkspaceID          int64
	ReminderID           *int64
	Frequency            int
	ThresholdHours       float64
	EmailReminderEnabled bool
	SlackReminderEnabled bool
	UserIDs              []int64
	GroupIDs             []int64
}

type ExpenseView struct {
	ID            int64
	WorkspaceID   int64
	UserID        int64
	TimeEntryID   *int64
	Description   string
	Category      string
	State         string
	Currency      string
	TotalAmount   int
	DateOfExpense time.Time
	DeletedAt     *time.Time
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

type CreateExpenseCommand struct {
	WorkspaceID   int64
	UserID        int64
	TimeEntryID   *int64
	Description   string
	Category      string
	State         string
	Currency      string
	TotalAmount   int
	DateOfExpense time.Time
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
	CreateTimeEntry(context.Context, CreateTimeEntryRecord) (TimeEntryView, error)
	GetTimeEntry(context.Context, int64, int64, int64) (TimeEntryView, bool, error)
	GetTimeEntryForUser(context.Context, int64, int64) (TimeEntryView, bool, error)
	ListTimeEntries(context.Context, int64, ListTimeEntriesFilter) ([]TimeEntryView, error)
	ListTimeEntriesForUser(context.Context, ListTimeEntriesFilter) ([]TimeEntryView, error)
	GetCurrentTimeEntry(context.Context, int64) (TimeEntryView, bool, error)
	UpdateTimeEntry(context.Context, UpdateTimeEntryRecord) (TimeEntryView, error)
	DeleteTimeEntry(context.Context, int64, int64, int64) error
	SetRunningTimeEntry(context.Context, int64, int64) error
	ClearRunningTimeEntry(context.Context, int64) error

	ListFavorites(context.Context, int64, int64) ([]FavoriteView, error)
	CreateFavorite(context.Context, CreateFavoriteRecord) (FavoriteView, error)
	UpdateFavorite(context.Context, UpdateFavoriteRecord) (FavoriteView, error)
	DeleteFavorite(context.Context, int64, int64, int64) error

	ListGoals(context.Context, int64, ListGoalsFilter) ([]GoalView, error)
	GetGoal(context.Context, int64, int64, int64) (GoalView, bool, error)
	CreateGoal(context.Context, CreateGoalRecord) (GoalView, error)
	UpdateGoal(context.Context, UpdateGoalRecord) (GoalView, error)
	DeleteGoal(context.Context, int64, int64, int64) error

	ListReminders(context.Context, int64) ([]ReminderView, error)
	GetReminder(context.Context, int64, int64) (ReminderView, bool, error)
	CreateReminder(context.Context, CreateReminderRecord) (ReminderView, error)
	UpdateReminder(context.Context, UpdateReminderRecord) (ReminderView, error)
	DeleteReminder(context.Context, int64, int64) error

	ListExpenses(context.Context, int64, int64) ([]ExpenseView, error)
	CreateExpense(context.Context, CreateExpenseRecord) (ExpenseView, error)

	ListTimelineEvents(context.Context, int64, int, int) ([]TimelineEventView, error)
	ReplaceTimelineEvents(context.Context, int64, []TimelineEventView) error
	DeleteTimelineEvents(context.Context, int64) error
	GetProjectStatistics(context.Context, int64, int64) (ProjectStatisticsView, error)
}

type CatalogQueries interface {
	GetProject(context.Context, int64, int64) (catalogapplication.ProjectView, error)
	GetTask(context.Context, int64, int64, int64) (catalogapplication.TaskView, error)
}

type CreateTimeEntryRecord struct {
	WorkspaceID int64
	UserID      int64
	ClientID    *int64
	ProjectID   *int64
	TaskID      *int64
	Description string
	Billable    bool
	Start       time.Time
	Stop        *time.Time
	Duration    int
	CreatedWith string
	TagIDs      []int64
	ExpenseIDs  []int64
}

type UpdateTimeEntryRecord struct {
	TimeEntryView
}

type CreateFavoriteRecord struct {
	WorkspaceID int64
	UserID      int64
	ProjectID   *int64
	TaskID      *int64
	Description string
	Billable    bool
	Public      bool
	Rank        int
	TagIDs      []int64
}

type UpdateFavoriteRecord struct {
	FavoriteView
}

type CreateGoalRecord struct {
	WorkspaceID   int64
	UserID        int64
	CreatorUserID int64
	Name          string
	Active        bool
	Billable      bool
	Comparison    string
	Recurrence    string
	Icon          string
	TargetSeconds int
	StartDate     time.Time
	EndDate       *time.Time
	ProjectIDs    []int64
	TaskIDs       []int64
	TagIDs        []int64
}

type UpdateGoalRecord struct {
	GoalView
}

type CreateReminderRecord struct {
	WorkspaceID          int64
	Frequency            int
	ThresholdHours       float64
	EmailReminderEnabled bool
	SlackReminderEnabled bool
	UserIDs              []int64
	GroupIDs             []int64
}

type UpdateReminderRecord struct {
	ReminderView
}

type CreateExpenseRecord struct {
	WorkspaceID   int64
	UserID        int64
	TimeEntryID   *int64
	Description   string
	Category      string
	State         string
	Currency      string
	TotalAmount   int
	DateOfExpense time.Time
}
