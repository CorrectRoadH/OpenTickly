package application

import (
	"context"
	"strings"
)

const auditLogCleanupBatchSize = 1000

func (service *Service) CleanupExpiredAuditLogs(ctx context.Context, retentionDays int) error {
	cutoff := service.now().AddDate(0, 0, -retentionDays)
	totalDeleted := int64(0)
	for {
		deleted, err := service.store.DeleteAuditLogsBefore(ctx, cutoff, auditLogCleanupBatchSize)
		if err != nil {
			service.logger.ErrorContext(ctx, "audit log cleanup batch failed",
				"cutoff", cutoff,
				"deleted_so_far", totalDeleted,
				"error", err.Error(),
			)
			return err
		}
		totalDeleted += deleted
		if deleted < int64(auditLogCleanupBatchSize) {
			break
		}
	}
	if totalDeleted > 0 {
		service.logger.InfoContext(ctx, "audit log cleanup completed",
			"cutoff", cutoff,
			"total_deleted", totalDeleted,
		)
	}
	return nil
}

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
