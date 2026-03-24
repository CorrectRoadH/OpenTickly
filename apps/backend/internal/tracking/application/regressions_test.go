package application_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	identitydomain "opentoggl/backend/apps/backend/internal/identity/domain"
	identitypostgres "opentoggl/backend/apps/backend/internal/identity/infra/postgres"
	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"
	membershippostgres "opentoggl/backend/apps/backend/internal/membership/infra/postgres"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"
	tenantpostgres "opentoggl/backend/apps/backend/internal/tenant/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"

	"github.com/samber/lo"
)

// TestRunningTimerConflictOnCreateEntryPoint verifies VAL-REG-001:
// If a user already has a running timer and attempts to start another one via
// CreateTimeEntry, the conflict handling returns ErrRunningTimeEntryExists.
// This proves one fixed handling rule for the CreateTimeEntry entry point.
func TestRunningTimerConflictOnCreateEntryPoint(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "timer-conflict")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	// Start the first running timer (no stop time)
	firstStart := time.Now().UTC()
	firstEntry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: "First running timer",
		Start:       firstStart,
		CreatedWith: "conflict-test",
	})
	if err != nil {
		t.Fatalf("create first running timer: %v", err)
	}
	if firstEntry.Stop != nil {
		t.Fatalf("expected first entry to be running (no stop), got stop %s", *firstEntry.Stop)
	}

	// Verify the first timer is the current running timer
	current, err := trackingService.GetCurrentTimeEntry(ctx, userID)
	if err != nil {
		t.Fatalf("get current time entry: %v", err)
	}
	if current.ID != firstEntry.ID {
		t.Fatalf("expected current timer ID %d, got %d", firstEntry.ID, current.ID)
	}

	// Attempt to start a second running timer - should be rejected with conflict error
	secondStart := time.Now().UTC()
	_, err = trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: "Second running timer - should conflict",
		Start:       secondStart,
		CreatedWith: "conflict-test",
	})
	if err == nil {
		t.Fatalf("expected conflict error when starting second running timer, got nil")
	}
	if err != trackingapplication.ErrRunningTimeEntryExists {
		t.Fatalf("expected ErrRunningTimeEntryExists, got %v", err)
	}

	// Verify the first running timer is still the current running timer
	current, err = trackingService.GetCurrentTimeEntry(ctx, userID)
	if err != nil {
		t.Fatalf("get current time entry after conflict: %v", err)
	}
	if current.ID != firstEntry.ID {
		t.Fatalf("expected current timer to still be first entry %d after conflict, got %d", firstEntry.ID, current.ID)
	}

	// Stop the first timer
	stopTime := time.Now().UTC()
	stoppedEntry, err := trackingService.UpdateTimeEntry(ctx, trackingapplication.UpdateTimeEntryCommand{
		WorkspaceID: workspaceID,
		TimeEntryID: firstEntry.ID,
		UserID:      userID,
		Stop:        &stopTime,
	})
	if err != nil {
		t.Fatalf("stop first running timer: %v", err)
	}
	if stoppedEntry.Stop == nil {
		t.Fatalf("expected stopped entry to have stop time, got nil")
	}

	// Now we should be able to start a new running timer
	newStart := time.Now().UTC()
	newEntry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: "New running timer after stopping previous",
		Start:       newStart,
		CreatedWith: "conflict-test",
	})
	if err != nil {
		t.Fatalf("create running timer after stopping previous: %v", err)
	}
	if newEntry.Stop != nil {
		t.Fatalf("expected new entry to be running, got stop %s", *newEntry.Stop)
	}
}

// TestHistoricalEntriesSurviveProjectArchival verifies VAL-REG-003:
// Historical time entries remain visible after related projects are archived.
// Future mutability can change, but historical facts must not disappear.
func TestHistoricalEntriesSurviveProjectArchival(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "history-project")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	// Create a project
	project, err := catalogService.CreateProject(ctx, catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "Archival Test Project",
	})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}

	// Create a stopped time entry associated with the project
	start := time.Date(2026, 3, 20, 10, 0, 0, 0, time.UTC)
	stop := time.Date(2026, 3, 20, 11, 30, 0, 0, time.UTC)
	entry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: "Historical entry before archival",
		Start:       start,
		Stop:        &stop,
		ProjectID:   lo.ToPtr(project.ID),
		CreatedWith: "history-test",
	})
	if err != nil {
		t.Fatalf("create time entry: %v", err)
	}

	// Verify the entry is readable before archival
	readbackBefore, err := trackingService.GetTimeEntry(ctx, workspaceID, userID, entry.ID)
	if err != nil {
		t.Fatalf("get time entry before archival: %v", err)
	}
	if readbackBefore.ID != entry.ID {
		t.Fatalf("expected readback ID %d, got %d", entry.ID, readbackBefore.ID)
	}
	if readbackBefore.ProjectID == nil || *readbackBefore.ProjectID != project.ID {
		t.Fatalf("expected project ID %d, got %#v", project.ID, readbackBefore.ProjectID)
	}

	// Archive the project (set Active to false)
	_, err = catalogService.UpdateProject(ctx, catalogapplication.UpdateProjectCommand{
		WorkspaceID: workspaceID,
		ProjectID:   project.ID,
		Active:      lo.ToPtr(false),
	})
	if err != nil {
		t.Fatalf("archive project: %v", err)
	}

	// Verify the historical time entry is STILL readable after project archival
	readbackAfter, err := trackingService.GetTimeEntry(ctx, workspaceID, userID, entry.ID)
	if err != nil {
		t.Fatalf("get time entry after project archival: %v", err)
	}
	if readbackAfter.ID != entry.ID {
		t.Fatalf("expected readback ID %d after archival, got %d", entry.ID, readbackAfter.ID)
	}
	if readbackAfter.Description != entry.Description {
		t.Fatalf("expected description %q after archival, got %q", entry.Description, readbackAfter.Description)
	}
	if readbackAfter.ProjectID == nil || *readbackAfter.ProjectID != project.ID {
		t.Fatalf("expected project ID %d to persist after archival, got %#v", project.ID, readbackAfter.ProjectID)
	}

	// Also verify via ListTimeEntries that the entry is still listed
	entries, err := trackingService.ListTimeEntries(ctx, workspaceID, trackingapplication.ListTimeEntriesFilter{
		UserID: userID,
	})
	if err != nil {
		t.Fatalf("list time entries after archival: %v", err)
	}
	found := false
	for _, e := range entries {
		if e.ID == entry.ID {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected archived-project time entry to still appear in list after archival")
	}
}

// TestHistoricalEntriesSurviveMemberDisable verifies VAL-REG-003:
// Historical time entries remain visible after related members are disabled.
// Future mutability can change, but historical facts must not disappear.
func TestHistoricalEntriesSurviveMemberDisable(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	// Create workspace and users via tenant/membership
	tenantStore := tenantpostgres.NewStore(database.Pool)
	_, workspace, err := tenantStore.CreateOrganization(
		ctx,
		"History Member Org",
		"History Member Workspace",
		tenantdomain.DefaultWorkspaceSettings(),
	)
	if err != nil {
		t.Fatalf("create tenant state: %v", err)
	}
	workspaceID := int64(workspace.ID())

	// Create two users - owner and member
	baseID := time.Now().UnixNano() % 100000000000
	ownerID := baseID
	memberID := baseID + 1
	ownerEmail := fmt.Sprintf("history-owner-%d@example.com", ownerID)
	memberEmail := fmt.Sprintf("history-member-%d@example.com", memberID)

	// Register and save owner
	owner, err := identitydomain.RegisterUser(identitydomain.RegisterParams{
		ID:       ownerID,
		Email:    ownerEmail,
		FullName: "History Owner",
		Password: "secret1",
		APIToken: ownerEmail + "-token",
	})
	if err != nil {
		t.Fatalf("register owner: %v", err)
	}
	if err := identitypostgres.NewUserRepository(database.Pool).Save(ctx, owner); err != nil {
		t.Fatalf("save owner: %v", err)
	}

	// Register and save member
	member, err := identitydomain.RegisterUser(identitydomain.RegisterParams{
		ID:       memberID,
		Email:    memberEmail,
		FullName: "History Member",
		Password: "secret1",
		APIToken: memberEmail + "-token",
	})
	if err != nil {
		t.Fatalf("register member: %v", err)
	}
	if err := identitypostgres.NewUserRepository(database.Pool).Save(ctx, member); err != nil {
		t.Fatalf("save member: %v", err)
	}

	// Set up membership service
	membershipService, err := membershipapplication.NewService(membershippostgres.NewStore(database.Pool))
	if err != nil {
		t.Fatalf("new membership service: %v", err)
	}

	// Make owner a workspace owner
	ownerMember, err := membershipService.EnsureWorkspaceOwner(ctx, membershipapplication.EnsureWorkspaceOwnerCommand{
		WorkspaceID: workspaceID,
		UserID:      ownerID,
	})
	if err != nil {
		t.Fatalf("ensure owner: %v", err)
	}

	// Add member as workspace owner (creates directly in Joined state so they can be disabled)
	memberMember, err := membershipService.EnsureWorkspaceOwner(ctx, membershipapplication.EnsureWorkspaceOwnerCommand{
		WorkspaceID: workspaceID,
		UserID:      memberID,
	})
	if err != nil {
		t.Fatalf("ensure member: %v", err)
	}

	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	// Create a stopped time entry for the member
	start := time.Date(2026, 3, 21, 14, 0, 0, 0, time.UTC)
	stop := time.Date(2026, 3, 21, 15, 0, 0, 0, time.UTC)
	entry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      memberID,
		Description: "Historical entry before member disable",
		Start:       start,
		Stop:        &stop,
		CreatedWith: "history-test",
	})
	if err != nil {
		t.Fatalf("create time entry: %v", err)
	}

	// Verify the entry is readable before disable
	readbackBefore, err := trackingService.GetTimeEntry(ctx, workspaceID, memberID, entry.ID)
	if err != nil {
		t.Fatalf("get time entry before disable: %v", err)
	}
	if readbackBefore.ID != entry.ID {
		t.Fatalf("expected readback ID %d, got %d", entry.ID, readbackBefore.ID)
	}

	// Disable the member
	_, err = membershipService.DisableWorkspaceMember(ctx, workspaceID, memberMember.ID, *ownerMember.UserID)
	if err != nil {
		t.Fatalf("disable member: %v", err)
	}

	// Verify the historical time entry is STILL readable after member disable
	readbackAfter, err := trackingService.GetTimeEntry(ctx, workspaceID, memberID, entry.ID)
	if err != nil {
		t.Fatalf("get time entry after member disable: %v", err)
	}
	if readbackAfter.ID != entry.ID {
		t.Fatalf("expected readback ID %d after member disable, got %d", entry.ID, readbackAfter.ID)
	}
	if readbackAfter.Description != entry.Description {
		t.Fatalf("expected description %q after disable, got %q", entry.Description, readbackAfter.Description)
	}

	// Also verify via ListUserTimeEntries that the entry is still listed
	entries, err := trackingService.ListUserTimeEntries(ctx, trackingapplication.ListTimeEntriesFilter{
		UserID: memberID,
	})
	if err != nil {
		t.Fatalf("list user time entries after disable: %v", err)
	}
	found := false
	for _, e := range entries {
		if e.ID == entry.ID {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("expected disabled-member time entry to still appear in list after disable")
	}
}
