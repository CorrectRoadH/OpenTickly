package application

import "context"

type ExportScope string

const (
	ExportScopeUser      ExportScope = "user"
	ExportScopeWorkspace ExportScope = "workspace"

	ExportStateCompleted = "completed"

	ImportSourceTogglExportArchive = "toggl_export_archive"
	ImportSourceTimeEntriesCSV     = "time_entries_csv"
	ImportStatusQueued             = "queued"
	ImportStatusRunning            = "running"
	ImportStatusCompleted          = "completed"
	ImportStatusFailed             = "failed"
)

type UserExportSelection struct {
	Profile  bool
	Timeline bool
}

type ExportRecordView struct {
	Token        string
	State        string
	ErrorMessage string
}

type ExportArchiveView struct {
	Token    string
	Filename string
	Content  []byte
}

type SaveExportCommand struct {
	Scope       ExportScope
	ScopeID     int64
	RequestedBy int64
	Token       string
	Objects     []string
	Content     []byte
}

type ImportJobView struct {
	JobID        string
	ErrorMessage string
	Status       string
	WorkspaceID  int64
}

type SaveImportJobCommand struct {
	ArchiveContent []byte
	JobID          string
	RequestedBy    int64
	Source         string
	Status         string
	WorkspaceID    int64
}

type UpdateImportJobCommand struct {
	ErrorMessage string
	JobID        string
	Status       string
}

type ImportWorkspaceArchiveCommand struct {
	Archive     ImportedArchive
	JobID       string
	RequestedBy int64
	WorkspaceID int64
}

type ImportedTimeEntry struct {
	Billable    bool
	ClientName  string
	Description string
	Duration    int
	Email       string
	End         *ImportedTime
	ProjectName string
	Start       ImportedTime
	TagNames    []string
	TaskName    string
	UserName    string
}

type ImportedTimeEntries struct {
	Items []ImportedTimeEntry
}

type ImportedTime struct {
	Value string
}

type ImportTimeEntriesCommand struct {
	Entries     ImportedTimeEntries
	JobID       string
	RequestedBy int64
	WorkspaceID int64
}

type Store interface {
	ListExports(context.Context, ExportScope, int64) ([]ExportRecordView, error)
	SaveExport(context.Context, SaveExportCommand) (ExportRecordView, error)
	GetExportArchive(context.Context, ExportScope, int64, string) (ExportArchiveView, bool, error)
	SaveImportJob(context.Context, SaveImportJobCommand) (ImportJobView, error)
	GetImportJob(context.Context, string) (ImportJobView, bool, error)
	UpdateImportJob(context.Context, UpdateImportJobCommand) (ImportJobView, error)
	ImportWorkspaceArchive(context.Context, ImportWorkspaceArchiveCommand) error
	ImportTimeEntries(context.Context, ImportTimeEntriesCommand) error
}
