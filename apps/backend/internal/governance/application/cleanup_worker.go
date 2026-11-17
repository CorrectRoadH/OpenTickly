package application

import (
	"context"
	"opentoggl/backend/apps/backend/internal/monitoring"
	"time"
)

func StartAuditLogCleanupWorker(ctx context.Context, service *Service, retentionDays int) {
	go func() {
		_ = monitoring.TraceScheduler(ctx, "audit_cleanup", func(taskCtx context.Context) error { return service.CleanupExpiredAuditLogs(taskCtx, retentionDays) })

		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				_ = monitoring.TraceScheduler(ctx, "audit_cleanup", func(taskCtx context.Context) error { return service.CleanupExpiredAuditLogs(taskCtx, retentionDays) })
			}
		}
	}()
}
