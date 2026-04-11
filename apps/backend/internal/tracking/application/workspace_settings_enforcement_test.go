package application_test

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"

	"github.com/samber/lo"
)

// ---------------------------------------------------------------------------
// Workspace settings enforcement tests (TDD RED phase)
//
// These tests verify that the tracking service layer enforces workspace-level
// policy settings. Today all settings are stored but never checked — a user
// who bypasses the frontend (e.g. direct API call) can ignore every policy.
// ---------------------------------------------------------------------------

// --- ReportLockedAt --------------------------------------------------------

// TestReportLockedAt_RejectsEditBeforeLockDate verifies that when the
// workspace setting report_locked_at is set, updating a time entry whose
// start time is before the lock date is rejected.
//
// Security gap: without this enforcement, any user can retroactively edit
// time entries that were supposed to be locked for payroll/compliance
// purposes, undermining the audit trail.
func TestReportLockedAt_RejectsEditBeforeLockDate(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "lock-edit")

	// Set report_locked_at to March 20 — entries before this date are immutable.
	updateTrackingWorkspaceSettings(t, ctx, database, workspaceID, tenantdomain.WorkspaceSettingsInput{
		ReportLockedAt: "2026-03-20T00:00:00Z",
	})

	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	// Create a time entry before the lock date.
	start := time.Date(2026, 3, 15, 10, 0, 0, 0, time.UTC)
	stop := time.Date(2026, 3, 15, 11, 0, 0, 0, time.UTC)
	entry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: "Locked entry",
		Start:       start,
		Stop:        &stop,
		CreatedWith: "lock-test",
	})
	if err != nil {
		t.Fatalf("create time entry: %v", err)
	}

	// Attempt to update the locked entry — should be rejected.
	newDescription := "Tampered description"
	_, err = trackingService.UpdateTimeEntry(ctx, trackingapplication.UpdateTimeEntryCommand{
		WorkspaceID: workspaceID,
		TimeEntryID: entry.ID,
		UserID:      userID,
		Description: &newDescription,
	})
	if err == nil {
		t.Fatal("expected UpdateTimeEntry to be rejected for entry before report_locked_at")
	}
	if err != trackingapplication.ErrReportLocked {
		t.Fatalf("expected ErrReportLocked, got %v", err)
	}

	// Verify the entry was not mutated.
	readback, err := trackingService.GetTimeEntry(ctx, workspaceID, userID, entry.ID)
	if err != nil {
		t.Fatalf("readback: %v", err)
	}
	if readback.Description != "Locked entry" {
		t.Fatalf("entry was mutated despite lock; description=%q", readback.Description)
	}
}

// TestReportLockedAt_AllowsEditAfterLockDate verifies that time entries
// whose start time is after the lock date can still be edited normally.
func TestReportLockedAt_AllowsEditAfterLockDate(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "lock-ok")

	updateTrackingWorkspaceSettings(t, ctx, database, workspaceID, tenantdomain.WorkspaceSettingsInput{
		ReportLockedAt: "2026-03-20T00:00:00Z",
	})

	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	// Create an entry after the lock date.
	start := time.Date(2026, 3, 25, 10, 0, 0, 0, time.UTC)
	stop := time.Date(2026, 3, 25, 11, 0, 0, 0, time.UTC)
	entry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: "Unlocked entry",
		Start:       start,
		Stop:        &stop,
		CreatedWith: "lock-test",
	})
	if err != nil {
		t.Fatalf("create time entry: %v", err)
	}

	// Update should succeed.
	newDescription := "Updated description"
	updated, err := trackingService.UpdateTimeEntry(ctx, trackingapplication.UpdateTimeEntryCommand{
		WorkspaceID: workspaceID,
		TimeEntryID: entry.ID,
		UserID:      userID,
		Description: &newDescription,
	})
	if err != nil {
		t.Fatalf("expected update to succeed after lock date, got %v", err)
	}
	if updated.Description != "Updated description" {
		t.Fatalf("expected updated description, got %q", updated.Description)
	}
}

// TestReportLockedAt_RejectsDeleteBeforeLockDate verifies that deleting
// a time entry before the lock date is also rejected.
func TestReportLockedAt_RejectsDeleteBeforeLockDate(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "lock-del")

	updateTrackingWorkspaceSettings(t, ctx, database, workspaceID, tenantdomain.WorkspaceSettingsInput{
		ReportLockedAt: "2026-03-20T00:00:00Z",
	})

	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	start := time.Date(2026, 3, 15, 10, 0, 0, 0, time.UTC)
	stop := time.Date(2026, 3, 15, 11, 0, 0, 0, time.UTC)
	entry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: "Locked entry to delete",
		Start:       start,
		Stop:        &stop,
		CreatedWith: "lock-test",
	})
	if err != nil {
		t.Fatalf("create time entry: %v", err)
	}

	err = trackingService.DeleteTimeEntry(ctx, workspaceID, userID, entry.ID)
	if err == nil {
		t.Fatal("expected DeleteTimeEntry to be rejected for entry before report_locked_at")
	}
	if err != trackingapplication.ErrReportLocked {
		t.Fatalf("expected ErrReportLocked, got %v", err)
	}

	// Entry must still exist.
	_, err = trackingService.GetTimeEntry(ctx, workspaceID, userID, entry.ID)
	if err != nil {
		t.Fatalf("locked entry should still exist after denied delete: %v", err)
	}
}

// --- RequiredTimeEntryFields -----------------------------------------------

// TestRequiredTimeEntryFields_RejectsCreateWithoutProject verifies that when
// the workspace setting required_time_entry_fields includes "project",
// creating a time entry without a project is rejected.
//
// Business rule: organizations that require project tracking for billing or
// reporting configure this setting. Without backend enforcement, users can
// create untagged entries via direct API call that break reporting.
func TestRequiredTimeEntryFields_RejectsCreateWithoutProject(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "req-project")

	updateTrackingWorkspaceSettings(t, ctx, database, workspaceID, tenantdomain.WorkspaceSettingsInput{
		RequiredTimeEntryFields: []string{"project"},
	})

	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	// Create without project — should be rejected.
	start := time.Date(2026, 3, 25, 10, 0, 0, 0, time.UTC)
	stop := time.Date(2026, 3, 25, 11, 0, 0, 0, time.UTC)
	_, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: "No project",
		Start:       start,
		Stop:        &stop,
		CreatedWith: "req-test",
	})
	if err == nil {
		t.Fatal("expected CreateTimeEntry to be rejected when required field 'project' is missing")
	}
	if err != trackingapplication.ErrRequiredFieldMissing {
		t.Fatalf("expected ErrRequiredFieldMissing, got %v", err)
	}
}

// TestRequiredTimeEntryFields_AllowsCreateWithProject verifies that when
// the project field is required and provided, creation succeeds.
func TestRequiredTimeEntryFields_AllowsCreateWithProject(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "req-project-ok")

	updateTrackingWorkspaceSettings(t, ctx, database, workspaceID, tenantdomain.WorkspaceSettingsInput{
		RequiredTimeEntryFields: []string{"project"},
	})

	catalogService := mustNewTrackingCatalogService(t, database)

	// Create a project to reference.
	project, err := catalogService.CreateProject(ctx, catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "Required Project",
	})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}

	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	start := time.Date(2026, 3, 25, 10, 0, 0, 0, time.UTC)
	stop := time.Date(2026, 3, 25, 11, 0, 0, 0, time.UTC)
	entry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: "With project",
		ProjectID:   lo.ToPtr(project.ID),
		Start:       start,
		Stop:        &stop,
		CreatedWith: "req-test",
	})
	if err != nil {
		t.Fatalf("expected create to succeed with required project, got %v", err)
	}
	if entry.ProjectID == nil || *entry.ProjectID != project.ID {
		t.Fatalf("expected project_id=%d, got %v", project.ID, entry.ProjectID)
	}
}

// TestRequiredTimeEntryFields_RejectsCreateWithoutDescription verifies that
// when required_time_entry_fields includes "description", creating a time
// entry with an empty description is rejected.
func TestRequiredTimeEntryFields_RejectsCreateWithoutDescription(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "req-desc")

	updateTrackingWorkspaceSettings(t, ctx, database, workspaceID, tenantdomain.WorkspaceSettingsInput{
		RequiredTimeEntryFields: []string{"description"},
	})

	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	start := time.Date(2026, 3, 25, 10, 0, 0, 0, time.UTC)
	stop := time.Date(2026, 3, 25, 11, 0, 0, 0, time.UTC)
	_, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: "",
		Start:       start,
		Stop:        &stop,
		CreatedWith: "req-test",
	})
	if err == nil {
		t.Fatal("expected CreateTimeEntry to be rejected when required field 'description' is empty")
	}
	if err != trackingapplication.ErrRequiredFieldMissing {
		t.Fatalf("expected ErrRequiredFieldMissing, got %v", err)
	}
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

// updateTrackingWorkspaceSettings updates workspace settings via direct SQL.
// This is simpler than going through the full tenant service for test setup.
func updateTrackingWorkspaceSettings(
	t *testing.T,
	ctx context.Context,
	database *pgtest.Database,
	workspaceID int64,
	input tenantdomain.WorkspaceSettingsInput,
) {
	t.Helper()

	settings, err := tenantdomain.NewWorkspaceSettings(input)
	if err != nil {
		t.Fatalf("build workspace settings: %v", err)
	}

	fieldsJSON, err := json.Marshal(settings.RequiredTimeEntryFields())
	if err != nil {
		t.Fatalf("marshal required fields: %v", err)
	}

	_, err = database.Pool.Exec(ctx, `
		update tenant_workspaces
		set report_locked_at = $2,
		    required_time_entry_fields = $3
		where id = $1
	`, workspaceID, settings.ReportLockedAt(), fieldsJSON)
	if err != nil {
		t.Fatalf("update workspace settings: %v", err)
	}
}
