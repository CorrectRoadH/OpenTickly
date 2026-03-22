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
	Active    *bool
	ProjectID *int64
	Search    string
	Page      int
	PerPage   int
	SortField TaskSortField
	SortOrder SortOrder
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

type Store interface {
	ListClients(context.Context, int64, ListClientsFilter) ([]ClientView, error)
	CreateClient(context.Context, CreateClientCommand) (ClientView, error)
	ListGroups(context.Context, int64) ([]GroupView, error)
	CreateGroup(context.Context, CreateGroupCommand) (GroupView, error)
	ListTags(context.Context, int64, ListTagsFilter) ([]TagView, error)
	CreateTag(context.Context, CreateTagCommand) (TagView, error)
	ListProjectUsers(context.Context, int64, ListProjectUsersFilter) ([]ProjectUserView, error)
	ListProjects(context.Context, int64, ListProjectsFilter) ([]ProjectView, error)
	GetProject(context.Context, int64, int64) (ProjectView, bool, error)
	CreateProject(context.Context, CreateProjectCommand) (ProjectView, error)
	UpdateProject(context.Context, ProjectView) error
	SetProjectPinned(context.Context, int64, int64, bool) error
	ListTasks(context.Context, int64, ListTasksFilter) (TaskPage, error)
}
