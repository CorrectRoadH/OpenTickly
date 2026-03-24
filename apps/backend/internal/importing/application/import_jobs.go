package application

import (
	"context"
	"errors"
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
	importedArchive, err := parseImportedArchive(archive)
	if err != nil {
		return ImportJobView{}, err
	}

	jobID, err := newExportToken()
	if err != nil {
		return ImportJobView{}, err
	}
	_, err = service.store.SaveImportJob(ctx, SaveImportJobCommand{
		ArchiveContent: archive,
		JobID:          jobID,
		RequestedBy:    requestedBy,
		Source:         source,
		Status:         ImportStatusQueued,
		WorkspaceID:    workspaceID,
	})
	if err != nil {
		return ImportJobView{}, err
	}

	if err := service.store.ImportWorkspaceArchive(ctx, ImportWorkspaceArchiveCommand{
		Archive:     importedArchive,
		JobID:       jobID,
		RequestedBy: requestedBy,
		WorkspaceID: workspaceID,
	}); err != nil {
		failedJob, updateErr := service.store.UpdateImportJob(ctx, UpdateImportJobCommand{
			ErrorMessage: err.Error(),
			JobID:        jobID,
			Status:       ImportStatusFailed,
		})
		if updateErr != nil {
			return ImportJobView{}, updateErr
		}
		return failedJob, nil
	}

	return service.store.UpdateImportJob(ctx, UpdateImportJobCommand{
		JobID:  jobID,
		Status: ImportStatusCompleted,
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
