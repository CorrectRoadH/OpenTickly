package application

import (
	"context"
	"strings"
)

func (service *Service) InsertAuditLog(ctx context.Context, command InsertAuditLogCommand) error {
	if command.OrganizationID <= 0 {
		return ErrInvalidOrganization
	}
	return service.store.InsertAuditLog(ctx, command)
}

func (service *Service) ListAuditLogs(
	ctx context.Context,
	organizationID int64,
	filter ListAuditLogsFilter,
) ([]AuditLogView, error) {
	if organizationID <= 0 {
		return nil, ErrInvalidOrganization
	}
	if filter.From.IsZero() || filter.To.IsZero() || filter.From.After(filter.To) {
		return nil, ErrInvalidAuditLogWindow
	}
	if filter.PageSize <= 0 {
		filter.PageSize = 50
	}
	if filter.PageNumber <= 0 {
		filter.PageNumber = 1
	}
	filter.EntityType = strings.TrimSpace(filter.EntityType)
	filter.Action = strings.TrimSpace(filter.Action)
	return service.store.ListAuditLogs(ctx, organizationID, filter)
}
