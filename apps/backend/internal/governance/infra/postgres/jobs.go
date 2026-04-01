package postgres

import (
	"context"
	"fmt"

	governanceapplication "opentoggl/backend/apps/backend/internal/governance/application"
	"opentoggl/backend/apps/backend/internal/platform"
)

const AuditLogJobName = "governance.audit_log.insert"

// NewAuditLogJobDefinition returns a JobDefinition that handles audit log insertion
// for the given governance service. Register this with the platform JobRunner at startup.
func NewAuditLogJobDefinition(service *governanceapplication.Service) platform.JobDefinition {
	return platform.JobDefinition{
		Name: AuditLogJobName,
		Run: func(ctx context.Context, job platform.Job) error {
			command, ok := job.Payload.(governanceapplication.InsertAuditLogCommand)
			if !ok {
				return fmt.Errorf("audit_log job: unexpected payload type %T", job.Payload)
			}
			return service.InsertAuditLog(ctx, command)
		},
	}
}
