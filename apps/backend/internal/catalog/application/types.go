package application

import (
	"context"
	"time"
)

type ClientStatus string

const (
	ClientStatusBoth     ClientStatus = "both"
	ClientStatusActive   ClientStatus = "active"
	ClientStatusArchived ClientStatus = "archived"
)

type SortOrder string

const (
	SortOrderAscending  SortOrder = "ASC"
	SortOrderDescending SortOrder = "DESC"
)

type ProjectSortField string

const (
	ProjectSortFieldName      ProjectSortField = "name"
	ProjectSortFieldCreatedAt ProjectSortField = "created_at"
)

type TaskSortField string

const (
	TaskSortFieldName      TaskSortField = "name"
	TaskSortFieldCreatedAt TaskSortField = "created_at"
)

type ClientView struct {
	ID          int64
	WorkspaceID int64
	Name        string
	Archived    bool
	CreatedBy   *int64
	CreatedAt   time.Time
}

type GroupView struct {
	ID          int64
	WorkspaceID int64
	Name        string
	HasUsers    bool
	CreatedAt   time.Time
}

type TagView struct {
	ID          int64
	WorkspaceID int64
	Name        string
	DeletedAt   *time.Time
	CreatedBy   *int64
	CreatedAt   time.Time
}

type ProjectUserView struct {
	ProjectID   int64
	UserID      int64
	Role        string
	WorkspaceID int64
	CreatedAt   time.Time
}

type ProjectGroupView struct {
	ID          int64
	WorkspaceID int64
	ProjectID   int64
	GroupID     int64
}

type CreateProjectUserCommand struct {
	WorkspaceID int64
	ProjectID   int64
	UserID      int64
	Manager     bool
}

type CreateProjectGroupCommand struct {
	WorkspaceID int64
	ProjectID   int64
	GroupID     int64
}

type UpdateProjectUserCommand struct {
	WorkspaceID int64
	ProjectID   int64
	UserID      int64
	Manager     bool
}

type ProjectCountView struct {
	ProjectID int64
	Count     int
}

type RecurringPeriodView struct {
	StartDate time.Time
	EndDate   time.Time
}

type ProjectView struct {
	ID            int64
	WorkspaceID   int64
	ClientID      *int64
	Name          string
	Active        bool
	Pinned        bool
	Template      bool
	ActualSeconds int64
	Recurring     bool
	PeriodStart   *time.Time
	PeriodEnd     *time.Time
	ClientName    *string
	CreatedAt     time.Time
}

type TaskView struct {
	ID          int64
	WorkspaceID int64
	ProjectID   *int64
	Name        string
	Active      bool
	ProjectName *string
}

type TaskPage struct {
	Tasks      []TaskView
	Page       int
	PerPage    int
	TotalCount int
	SortField  TaskSortField
	SortOrder  SortOrder
}

type ListClientsFilter struct {
	Name   string
	Status ClientStatus
}

type ListTagsFilter struct {
	Search  string
	Page    int
	PerPage int
}

type ListProjectUsersFilter struct {
	ProjectIDs []int64
}

type ListProjectsFilter struct {
	Active        *bool
	OnlyTemplates bool
	Name          string
	Search        string
	Page          int
	PerPage       int
	SortField     ProjectSortField
	SortOrder     SortOrder
	SortPinned    bool
}

type ListTasksFilter struct {
	Active     *bool
	IncludeAll bool
	ProjectID  *int64
	Search     string
	Page       int
	PerPage    int
	SortField  TaskSortField
	SortOrder  SortOrder
}

type CreateClientCommand struct {
	WorkspaceID int64
	CreatedBy   int64
	Name        string
}

type CreateGroupCommand struct {
	WorkspaceID int64
	CreatedBy   int64
	Name        string
}

type CreateTagCommand struct {
	WorkspaceID int64
	CreatedBy   int64
	Name        string
}

type CreateProjectCommand struct {
	WorkspaceID int64
	CreatedBy   int64
	ClientID    *int64
	Name        string
	Active      *bool
	Template    *bool
	Recurring   *bool
}

type CreateTaskCommand struct {
	WorkspaceID int64
	CreatedBy   int64
	ProjectID   *int64
	Name        string
	Active      *bool
}

type UpdateClientCommand struct {
	WorkspaceID int64
	ClientID    int64
	Name        *string
}

type RestoreClientCommand struct {
	WorkspaceID        int64
	ClientID           int64
	RestoreAllProjects bool
	ProjectIDs         []int64
}

type UpdateProjectCommand struct {
	WorkspaceID int64
	ProjectID   int64
	ClientID    *int64
	Name        *string
	Active      *bool
	Template    *bool
	Recurring   *bool
}

type SetProjectPinnedCommand struct {
	WorkspaceID int64
	ProjectID   int64
	Pinned      bool
}

type UpdateTagCommand struct {
	WorkspaceID int64
	TagID       int64
	Name        *string
}

type UpdateTaskCommand struct {
	WorkspaceID int64
	ProjectID   int64
	TaskID      int64
	Name        *string
	Active      *bool
}

type PatchProjectCommand struct {
	WorkspaceID int64
	ProjectID   int64
	Name        *string
	ClientID    *int64
	Active      *bool
	Template    *bool
	Recurring   *bool
}

type PatchTaskCommand struct {
	WorkspaceID int64
	ProjectID   int64
	TaskID      int64
	Name        *string
	Active      *bool
}

type PatchProjectUserCommand struct {
	WorkspaceID int64
	ProjectID   int64
	UserID      int64
	Role        string
}

type Store interface {
	ListClients(context.Context, int64, ListClientsFilter) ([]ClientView, error)
	ListClientsByIDs(context.Context, int64, []int64) ([]ClientView, error)
	GetClient(context.Context, int64, int64) (ClientView, bool, error)
	CreateClient(context.Context, CreateClientCommand) (ClientView, error)
	UpdateClient(context.Context, ClientView) error
	DeleteClients(context.Context, int64, []int64) error
	ArchiveClientAndProjects(context.Context, int64, int64) ([]int64, error)
	RestoreClientAndProjects(context.Context, int64, int64, []int64, bool) error
	ListGroups(context.Context, int64) ([]GroupView, error)
	GetGroup(context.Context, int64, int64) (GroupView, bool, error)
	CreateGroup(context.Context, CreateGroupCommand) (GroupView, error)
	UpdateGroup(context.Context, GroupView) error
	DeleteGroup(context.Context, int64, int64) error
	ListTags(context.Context, int64, ListTagsFilter) ([]TagView, error)
	GetTag(context.Context, int64, int64) (TagView, bool, error)
	CreateTag(context.Context, CreateTagCommand) (TagView, error)
	UpdateTag(context.Context, TagView) error
	DeleteTag(context.Context, int64, int64) error
	DeleteTags(context.Context, int64, []int64) error
	ListProjectUsers(context.Context, int64, ListProjectUsersFilter) ([]ProjectUserView, error)
	GetProjectUser(context.Context, int64, int64, int64) (ProjectUserView, bool, error)
	CreateProjectUser(context.Context, CreateProjectUserCommand) (ProjectUserView, error)
	UpdateProjectUser(context.Context, ProjectUserView) error
	DeleteProjectUser(context.Context, int64, int64, int64) error
	ListProjectGroups(context.Context, int64, []int64) ([]ProjectGroupView, error)
	GetProjectGroup(context.Context, int64, int64) (ProjectGroupView, bool, error)
	CreateProjectGroup(context.Context, CreateProjectGroupCommand) (ProjectGroupView, error)
	DeleteProjectGroup(context.Context, int64, int64) error
	ListProjects(context.Context, int64, ListProjectsFilter) ([]ProjectView, error)
	GetProject(context.Context, int64, int64) (ProjectView, bool, error)
	CreateProject(context.Context, CreateProjectCommand) (ProjectView, error)
	UpdateProject(context.Context, ProjectView) error
	DeleteProject(context.Context, int64, int64) error
	CountProjectTasks(context.Context, int64, []int64) ([]ProjectCountView, error)
	CountProjectUsers(context.Context, int64, []int64) ([]ProjectCountView, error)
	SetProjectPinned(context.Context, int64, int64, bool) error
	ListTasks(context.Context, int64, ListTasksFilter) (TaskPage, error)
	GetTask(context.Context, int64, int64) (TaskView, bool, error)
	GetTaskByWorkspace(context.Context, int64, int64) (TaskView, bool, error)
	CreateTask(context.Context, CreateTaskCommand) (TaskView, error)
	UpdateTask(context.Context, TaskView) error
	DeleteTask(context.Context, int64, int64) error
	GetWorkspaceMemberByID(context.Context, int64, int64) (bool, error)
	CreateRate(context.Context, CreateRateCommand) (RateView, error)
	ListRatesByLevel(context.Context, int64, RateLevel, int64, RateType) ([]RateView, error)
	PatchProjects(context.Context, int64, []int64, []PatchProjectCommand) error
	PatchTasks(context.Context, int64, int64, []int64, []PatchTaskCommand) error
	PatchProjectUsers(context.Context, int64, [][2]int64, []PatchProjectUserCommand) error
}
