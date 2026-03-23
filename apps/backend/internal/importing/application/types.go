package application

import "context"

type ExportScope string

const (
	ExportScopeUser      ExportScope = "user"
	ExportScopeWorkspace ExportScope = "workspace"

	ExportStateCompleted = "completed"
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

type Store interface {
	ListExports(context.Context, ExportScope, int64) ([]ExportRecordView, error)
	SaveExport(context.Context, SaveExportCommand) (ExportRecordView, error)
	GetExportArchive(context.Context, ExportScope, int64, string) (ExportArchiveView, bool, error)
}
