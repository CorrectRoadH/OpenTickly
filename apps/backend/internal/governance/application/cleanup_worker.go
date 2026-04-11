package application

import (
	"context"
	"time"
)

func StartAuditLogCleanupWorker(ctx context.Context, service *Service, retentionDays int) {
	go func() {
		_ = service.CleanupExpiredAuditLogs(ctx, retentionDays)

		ticker := time.NewTicker(1 * time.Hour)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				_ = service.CleanupExpiredAuditLogs(ctx, retentionDays)
			}
		}
	}()
}
