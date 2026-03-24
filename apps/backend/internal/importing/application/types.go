package application

import "context"

type ExportScope string

const (
	ExportScopeUser      ExportScope = "user"
	ExportScopeWorkspace ExportScope = "workspace"

	ExportStateCompleted = "completed"

	ImportSourceTogglExportArchive = "toggl_export_archive"
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
	JobID       string
	Status      string
	WorkspaceID int64
}

type SaveImportJobCommand struct {
	ArchiveContent []byte
	JobID          string
	RequestedBy    int64
	Source         string
	Status         string
	WorkspaceID    int64
}

type Store interface {
	ListExports(context.Context, ExportScope, int64) ([]ExportRecordView, error)
	SaveExport(context.Context, SaveExportCommand) (ExportRecordView, error)
	GetExportArchive(context.Context, ExportScope, int64, string) (ExportArchiveView, bool, error)
	SaveImportJob(context.Context, SaveImportJobCommand) (ImportJobView, error)
	GetImportJob(context.Context, string) (ImportJobView, bool, error)
}
