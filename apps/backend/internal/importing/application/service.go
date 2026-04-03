package application

import (
	"archive/zip"
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"opentoggl/backend/apps/backend/internal/log"
)

var (
	ErrStoreRequired    = errors.New("importing store is required")
	ErrLoggerRequired   = errors.New("importing logger is required")
	ErrExportNotFound   = errors.New("export archive not found")
	ErrObjectsRequired  = errors.New("at least one object is required")
	ErrInvalidScopeID   = errors.New("scope id must be positive")
	ErrTokenCreate      = errors.New("generate export token")
)

type Service struct {
	store  Store
	logger log.Logger
	now    func() time.Time
}

func NewService(store Store, logger log.Logger) (*Service, error) {
	if store == nil {
		return nil, ErrStoreRequired
	}
	if logger == nil {
		return nil, ErrLoggerRequired
	}
	return &Service{
		store:  store,
		logger: logger,
		now: func() time.Time {
			return time.Now().UTC()
		},
	}, nil
}

func (service *Service) StartUserExport(
	ctx context.Context,
	userID int64,
	selection UserExportSelection,
) (string, error) {
	objects := make([]string, 0, 2)
	if selection.Profile {
		objects = append(objects, "profile")
	}
	if selection.Timeline {
		objects = append(objects, "timeline")
	}
	return service.startExport(ctx, ExportScopeUser, userID, userID, objects)
}

func (service *Service) StartWorkspaceExport(
	ctx context.Context,
	workspaceID int64,
	requestedBy int64,
	objects []string,
) (string, error) {
	return service.startExport(ctx, ExportScopeWorkspace, workspaceID, requestedBy, objects)
}

// StartWorkspaceExportWithData creates an export archive containing real workspace
// data (projects, clients, tags, etc.) in the same JSON format as the Toggl export
// archive, enabling round-trip import/export.
func (service *Service) StartWorkspaceExportWithData(
	ctx context.Context,
	workspaceID int64,
	requestedBy int64,
	objects []string,
	data WorkspaceExportData,
) (string, error) {
	if workspaceID <= 0 || requestedBy <= 0 {
		return "", ErrInvalidScopeID
	}
	normalized := normalizeObjects(objects)
	if len(normalized) == 0 {
		return "", ErrObjectsRequired
	}

	service.logger.InfoContext(ctx, "starting workspace export with data",
		"workspace_id", workspaceID,
		"requested_by", requestedBy,
		"objects", normalized,
	)

	token, err := newExportToken()
	if err != nil {
		return "", err
	}
	content, err := BuildWorkspaceArchive(workspaceID, requestedBy, normalized, data, service.now())
	if err != nil {
		return "", err
	}
	record, err := service.store.SaveExport(ctx, SaveExportCommand{
		Scope:       ExportScopeWorkspace,
		ScopeID:     workspaceID,
		RequestedBy: requestedBy,
		Token:       token,
		Objects:     normalized,
		Content:     content,
	})
	if err != nil {
		return "", err
	}
	return record.Token, nil
}

func (service *Service) ListUserExports(ctx context.Context, userID int64) ([]ExportRecordView, error) {
	return service.listExports(ctx, ExportScopeUser, userID)
}

func (service *Service) ListWorkspaceExports(ctx context.Context, workspaceID int64) ([]ExportRecordView, error) {
	return service.listExports(ctx, ExportScopeWorkspace, workspaceID)
}

func (service *Service) GetUserExportArchive(ctx context.Context, userID int64, token string) (ExportArchiveView, error) {
	return service.getArchive(ctx, ExportScopeUser, userID, token)
}

func (service *Service) GetWorkspaceExportArchive(
	ctx context.Context,
	workspaceID int64,
	token string,
) (ExportArchiveView, error) {
	return service.getArchive(ctx, ExportScopeWorkspace, workspaceID, token)
}

func (service *Service) listExports(
	ctx context.Context,
	scope ExportScope,
	scopeID int64,
) ([]ExportRecordView, error) {
	if scopeID <= 0 {
		return nil, ErrInvalidScopeID
	}
	return service.store.ListExports(ctx, scope, scopeID)
}

func (service *Service) startExport(
	ctx context.Context,
	scope ExportScope,
	scopeID int64,
	requestedBy int64,
	objects []string,
) (string, error) {
	if scopeID <= 0 || requestedBy <= 0 {
		return "", ErrInvalidScopeID
	}

	normalized := normalizeObjects(objects)
	if len(normalized) == 0 {
		return "", ErrObjectsRequired
	}

	service.logger.InfoContext(ctx, "starting export",
		"scope", string(scope),
		"scope_id", scopeID,
		"requested_by", requestedBy,
		"objects", normalized,
	)

	token, err := newExportToken()
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to generate export token",
			"scope", string(scope),
			"scope_id", scopeID,
			"error", err.Error(),
		)
		return "", err
	}
	content, err := buildArchive(scope, scopeID, requestedBy, normalized, service.now())
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to build export archive",
			"scope", string(scope),
			"scope_id", scopeID,
			"error", err.Error(),
		)
		return "", err
	}

	record, err := service.store.SaveExport(ctx, SaveExportCommand{
		Scope:       scope,
		ScopeID:     scopeID,
		RequestedBy: requestedBy,
		Token:       token,
		Objects:     normalized,
		Content:     content,
	})
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to save export",
			"scope", string(scope),
			"scope_id", scopeID,
			"error", err.Error(),
		)
		return "", err
	}
	service.logger.InfoContext(ctx, "export started",
		"token", record.Token,
		"scope", string(scope),
		"scope_id", scopeID,
	)
	return record.Token, nil
}

func (service *Service) getArchive(
	ctx context.Context,
	scope ExportScope,
	scopeID int64,
	token string,
) (ExportArchiveView, error) {
	if scopeID <= 0 {
		return ExportArchiveView{}, ErrInvalidScopeID
	}
	archive, ok, err := service.store.GetExportArchive(ctx, scope, scopeID, strings.TrimSpace(token))
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get export archive",
			"scope", string(scope),
			"scope_id", scopeID,
			"error", err.Error(),
		)
		return ExportArchiveView{}, err
	}
	if !ok {
		service.logger.WarnContext(ctx, "export archive not found",
			"scope", string(scope),
			"scope_id", scopeID,
			"token", token,
		)
		return ExportArchiveView{}, ErrExportNotFound
	}
	return archive, nil
}

func normalizeObjects(objects []string) []string {
	seen := make(map[string]struct{}, len(objects))
	normalized := make([]string, 0, len(objects))
	for _, object := range objects {
		value := strings.TrimSpace(object)
		if value == "" {
			continue
		}
		if _, ok := seen[value]; ok {
			continue
		}
		seen[value] = struct{}{}
		normalized = append(normalized, value)
	}
	return normalized
}

func newExportToken() (string, error) {
	buffer := make([]byte, 16)
	if _, err := rand.Read(buffer); err != nil {
		return "", fmt.Errorf("%w: %v", ErrTokenCreate, err)
	}
	return hex.EncodeToString(buffer), nil
}

func buildArchive(
	scope ExportScope,
	scopeID int64,
	requestedBy int64,
	objects []string,
	createdAt time.Time,
) ([]byte, error) {
	manifest, err := json.Marshal(struct {
		Scope       ExportScope `json:"scope"`
		ScopeID     int64       `json:"scope_id"`
		RequestedBy int64       `json:"requested_by"`
		CreatedAt   string      `json:"created_at"`
		Objects     []string    `json:"objects"`
	}{
		Scope:       scope,
		ScopeID:     scopeID,
		RequestedBy: requestedBy,
		CreatedAt:   createdAt.Format(time.RFC3339),
		Objects:     objects,
	})
	if err != nil {
		return nil, err
	}

	var buffer bytes.Buffer
	writer := zip.NewWriter(&buffer)
	entry, err := writer.Create("manifest.json")
	if err != nil {
		return nil, err
	}
	if _, err := entry.Write(manifest); err != nil {
		return nil, err
	}
	if err := writer.Close(); err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}
