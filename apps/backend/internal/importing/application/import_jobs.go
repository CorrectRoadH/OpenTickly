package application

import (
	"archive/zip"
	"bytes"
	"context"
	"errors"
	"fmt"
	"path"
	"strings"
)

var (
	ErrImportArchiveRequired = errors.New("import archive is required")
	ErrImportArchiveInvalid  = errors.New("import archive is invalid")
	ErrImportJobNotFound     = errors.New("import job not found")
	ErrImportSourceInvalid   = errors.New("import source is invalid")
)

func (service *Service) StartWorkspaceImport(
	ctx context.Context,
	workspaceID int64,
	requestedBy int64,
	source string,
	archive []byte,
) (ImportJobView, error) {
	if workspaceID <= 0 || requestedBy <= 0 {
		return ImportJobView{}, ErrInvalidScopeID
	}
	if strings.TrimSpace(source) != ImportSourceTogglExportArchive {
		return ImportJobView{}, ErrImportSourceInvalid
	}
	if len(archive) == 0 {
		return ImportJobView{}, ErrImportArchiveRequired
	}
	if err := validateTogglExportArchive(archive); err != nil {
		return ImportJobView{}, err
	}

	jobID, err := newExportToken()
	if err != nil {
		return ImportJobView{}, err
	}
	return service.store.SaveImportJob(ctx, SaveImportJobCommand{
		ArchiveContent: archive,
		JobID:          jobID,
		RequestedBy:    requestedBy,
		Source:         source,
		Status:         ImportStatusQueued,
		WorkspaceID:    workspaceID,
	})
}

func (service *Service) GetImportJob(ctx context.Context, jobID string) (ImportJobView, error) {
	normalizedJobID := strings.TrimSpace(jobID)
	if normalizedJobID == "" {
		return ImportJobView{}, ErrImportJobNotFound
	}

	job, ok, err := service.store.GetImportJob(ctx, normalizedJobID)
	if err != nil {
		return ImportJobView{}, err
	}
	if !ok {
		return ImportJobView{}, ErrImportJobNotFound
	}
	return job, nil
}

func validateTogglExportArchive(archive []byte) error {
	reader, err := zip.NewReader(bytes.NewReader(archive), int64(len(archive)))
	if err != nil {
		return fmt.Errorf("%w: unreadable zip", ErrImportArchiveInvalid)
	}

	requiredFiles := map[string]bool{
		"clients.json":  false,
		"projects.json": false,
		"tags.json":     false,
	}

	for _, file := range reader.File {
		if file.FileInfo().IsDir() {
			continue
		}
		name := path.Base(strings.TrimSpace(file.Name))
		if _, ok := requiredFiles[name]; ok {
			requiredFiles[name] = true
		}
	}

	missing := make([]string, 0, len(requiredFiles))
	for name, present := range requiredFiles {
		if !present {
			missing = append(missing, name)
		}
	}
	if len(missing) > 0 {
		return fmt.Errorf("%w: missing %s", ErrImportArchiveInvalid, strings.Join(missing, ", "))
	}
	return nil
}
