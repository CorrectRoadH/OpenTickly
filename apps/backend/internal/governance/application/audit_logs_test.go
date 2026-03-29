package application_test

import (
	"context"
	"testing"
	"time"

	governanceapplication "opentoggl/backend/apps/backend/internal/governance/application"
	governancepostgres "opentoggl/backend/apps/backend/internal/governance/infra/postgres"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"
	tenantpostgres "opentoggl/backend/apps/backend/internal/tenant/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestServiceListsAuditLogsByOrganizationWindowAndFilters(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	organization, workspace, err := tenantpostgres.NewStore(database.Pool).CreateOrganization(
		ctx,
		"Governance Org",
		"Governance Workspace",
		tenantdomain.DefaultWorkspaceSettings(),
	)
	if err != nil {
		t.Fatalf("create organization: %v", err)
	}

	service, err := governanceapplication.NewService(governancepostgres.NewStore(database.Pool))
	if err != nil {
		t.Fatalf("new governance service: %v", err)
	}

	organizationID := int64(organization.ID())
	workspaceID := int64(workspace.ID())
	insertAuditLog(t, ctx, database, organizationID, workspaceID, "project", 11, "created", 0, time.Date(2026, 3, 1, 10, 0, 0, 0, time.UTC))
	insertAuditLog(t, ctx, database, organizationID, workspaceID, "project", 12, "updated", 0, time.Date(2026, 3, 2, 10, 0, 0, 0, time.UTC))
	insertAuditLog(t, ctx, database, organizationID, 0, "organization", 99, "updated", 0, time.Date(2026, 3, 3, 10, 0, 0, 0, time.UTC))

	logs, err := service.ListAuditLogs(ctx, organizationID, governanceapplication.ListAuditLogsFilter{
		From:        time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC),
		To:          time.Date(2026, 3, 31, 23, 59, 59, 0, time.UTC),
		WorkspaceID: &workspaceID,
		Action:      "updated",
		PageSize:    10,
		PageNumber:  1,
	})
	if err != nil {
		t.Fatalf("list filtered audit logs: %v", err)
	}
	if len(logs) != 1 || logs[0].EntityID == nil || *logs[0].EntityID != 12 {
		t.Fatalf("expected one filtered audit log, got %#v", logs)
	}

	paged, err := service.ListAuditLogs(ctx, organizationID, governanceapplication.ListAuditLogsFilter{
		From:       time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC),
		To:         time.Date(2026, 3, 31, 23, 59, 59, 0, time.UTC),
		PageSize:   1,
		PageNumber: 2,
	})
	if err != nil {
		t.Fatalf("list paged audit logs: %v", err)
	}
	if len(paged) != 1 || paged[0].Action != "updated" {
		t.Fatalf("expected second page to contain second most recent audit log, got %#v", paged)
	}
}

func insertAuditLog(
	t *testing.T,
	ctx context.Context,
	database *pgtest.Database,
	organizationID int64,
	workspaceID int64,
	entityType string,
	entityID int64,
	action string,
	userID int64,
	createdAt time.Time,
) {
	t.Helper()

	var workspaceValue any
	if workspaceID > 0 {
		workspaceValue = workspaceID
	}
	var userValue any
	if userID > 0 {
		userValue = userID
	}

	if _, err := database.Pool.Exec(
		ctx,
		`insert into governance_audit_logs (
			organization_id,
			workspace_id,
			entity_type,
			entity_id,
			action,
			user_id,
			source,
			request_body,
			response_body,
			created_at
		) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
		organizationID,
		workspaceValue,
		entityType,
		entityID,
		action,
		userValue,
		"web",
		"",
		"",
		createdAt,
	); err != nil {
		t.Fatalf("insert audit log: %v", err)
	}
}
