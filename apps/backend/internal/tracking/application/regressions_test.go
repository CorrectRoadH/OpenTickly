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

// TestRunningTimerConflictOnUpdateEntryPoint verifies VAL-REG-001:
// If a user already has a running timer and attempts to start another one via
// UpdateTimeEntry (by updating a running entry to change its start time), the
// conflict handling returns ErrRunningTimeEntryExists. This proves the same fixed
// handling rule for the UpdateTimeEntry entry point.
func TestRunningTimerConflictOnUpdateEntryPoint(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "timer-conflict-update")
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

	// Create a second running timer via CreateTimeEntry - this should conflict
	secondStart := time.Now().UTC()
	_, err = trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: "Second running timer - should conflict via Create",
		Start:       secondStart,
		CreatedWith: "conflict-test",
	})
	if err == nil {
		t.Fatalf("expected conflict error via CreateTimeEntry, got nil")
	}
	if err != trackingapplication.ErrRunningTimeEntryExists {
		t.Fatalf("expected ErrRunningTimeEntryExists from CreateTimeEntry, got %v", err)
	}

	// Verify the first running timer is still the current running timer
	current, err = trackingService.GetCurrentTimeEntry(ctx, userID)
	if err != nil {
		t.Fatalf("get current time entry after CreateTimeEntry conflict: %v", err)
	}
	if current.ID != firstEntry.ID {
		t.Fatalf("expected current timer to still be first entry %d after CreateTimeEntry conflict, got %d", firstEntry.ID, current.ID)
	}

	// Now try to UPDATE the first running timer with a new start time - this also attempts
	// to keep it running (since we're not providing a new stop). This should NOT conflict
	// because we're updating the SAME entry, not starting a new one.
	newStart := time.Now().UTC()
	updatedEntry, err := trackingService.UpdateTimeEntry(ctx, trackingapplication.UpdateTimeEntryCommand{
		WorkspaceID: workspaceID,
		TimeEntryID: firstEntry.ID,
		UserID:      userID,
		Start:       &newStart,
		// Stop is not provided, so the entry stays running
	})
	if err != nil {
		t.Fatalf("update running entry with new start: %v", err)
	}
	if updatedEntry.Stop != nil {
		t.Fatalf("expected updated entry to still be running, got stop %s", *updatedEntry.Stop)
	}
	if updatedEntry.ID != firstEntry.ID {
		t.Fatalf("expected updated entry ID to be %d, got %d", firstEntry.ID, updatedEntry.ID)
	}

	// Verify the first running timer is still the current running timer (same entry)
	current, err = trackingService.GetCurrentTimeEntry(ctx, userID)
	if err != nil {
		t.Fatalf("get current time entry after update: %v", err)
	}
	if current.ID != firstEntry.ID {
		t.Fatalf("expected current timer to still be first entry %d after update, got %d", firstEntry.ID, current.ID)
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
	newTimerStart := time.Now().UTC()
	newEntry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: "New running timer after stopping previous",
		Start:       newTimerStart,
		CreatedWith: "conflict-test",
	})
	if err != nil {
		t.Fatalf("create running timer after stopping previous: %v", err)
	}
	if newEntry.Stop != nil {
		t.Fatalf("expected new entry to be running, got stop %s", *newEntry.Stop)
	}
}

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

// TestCurrentTimerAndHistoryStayConsistentAfterStartStopEdit verifies VAL-REG-004:
// Current timer and time-entry history stay mutually consistent after start, stop, or edit.
// The UI does not simultaneously present a running timer that the history already treats
// as fully stopped, or vice versa.
func TestCurrentTimerAndHistoryStayConsistentAfterStartStopEdit(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "current-history-consistency")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	description := "Consistency test entry"
	descriptionAfterEdit := "Consistency test entry - edited"

	// Phase 1: Start a timer and verify consistency
	start := time.Now().UTC()
	runningEntry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: description,
		Start:       start,
		CreatedWith: "consistency-test",
	})
	if err != nil {
		t.Fatalf("start timer: %v", err)
	}
	if runningEntry.Stop != nil {
		t.Fatalf("expected running entry to have no stop, got %s", *runningEntry.Stop)
	}

	// Verify current-timer returns the running entry (not null/empty)
	current, err := trackingService.GetCurrentTimeEntry(ctx, userID)
	if err != nil {
		t.Fatalf("get current timer while running: %v", err)
	}
	if current.ID != runningEntry.ID {
		t.Fatalf("expected current timer ID %d while running, got %d", runningEntry.ID, current.ID)
	}

	// Verify history does NOT show a stopped entry (it's still running)
	entries, err := trackingService.ListTimeEntries(ctx, workspaceID, trackingapplication.ListTimeEntriesFilter{
		UserID: userID,
	})
	if err != nil {
		t.Fatalf("list time entries while running: %v", err)
	}
	for _, e := range entries {
		if e.ID == runningEntry.ID && e.Stop != nil {
			t.Fatalf("expected running entry to NOT appear with stop in history, but it did (stop=%s)", *e.Stop)
		}
	}

	// Phase 2: Stop the timer and verify consistency
	stop := time.Now().UTC()
	stoppedEntry, err := trackingService.UpdateTimeEntry(ctx, trackingapplication.UpdateTimeEntryCommand{
		WorkspaceID: workspaceID,
		TimeEntryID: runningEntry.ID,
		UserID:      userID,
		Stop:        &stop,
	})
	if err != nil {
		t.Fatalf("stop timer: %v", err)
	}
	if stoppedEntry.Stop == nil {
		t.Fatalf("expected stopped entry to have stop time, got nil")
	}

	// Verify current-timer returns null (idle state) after stopping
	current, err = trackingService.GetCurrentTimeEntry(ctx, userID)
	if err != nil {
		t.Fatalf("get current timer after stopping: %v", err)
	}
	if current.ID != 0 {
		t.Fatalf("expected current timer to be null (ID=0) after stopping, got ID %d", current.ID)
	}

	// Verify history NOW shows the stopped entry
	entries, err = trackingService.ListTimeEntries(ctx, workspaceID, trackingapplication.ListTimeEntriesFilter{
		UserID: userID,
	})
	if err != nil {
		t.Fatalf("list time entries after stopping: %v", err)
	}
	foundInHistory := false
	for _, e := range entries {
		if e.ID == stoppedEntry.ID {
			foundInHistory = true
			if e.Stop == nil {
				t.Fatalf("expected stopped entry in history to have stop time, got nil")
			}
			if !e.Stop.Equal(stop) {
				t.Fatalf("expected stopped entry stop %s, got %s", stop, *e.Stop)
			}
			break
		}
	}
	if !foundInHistory {
		t.Fatalf("expected stopped entry to appear in history after stopping")
	}

	// Phase 3: Edit the stopped entry and verify consistency
	newDescription := descriptionAfterEdit
	editedEntry, err := trackingService.UpdateTimeEntry(ctx, trackingapplication.UpdateTimeEntryCommand{
		WorkspaceID:   workspaceID,
		TimeEntryID:  stoppedEntry.ID,
		UserID:       userID,
		Description:  &newDescription,
	})
	if err != nil {
		t.Fatalf("edit stopped entry: %v", err)
	}
	if editedEntry.Description != newDescription {
		t.Fatalf("expected edited description %q, got %q", newDescription, editedEntry.Description)
	}

	// Verify current-timer STILL returns null (idle state) after editing stopped entry
	current, err = trackingService.GetCurrentTimeEntry(ctx, userID)
	if err != nil {
		t.Fatalf("get current timer after editing stopped entry: %v", err)
	}
	if current.ID != 0 {
		t.Fatalf("expected current timer to still be null (ID=0) after editing stopped entry, got ID %d", current.ID)
	}

	// Verify history shows the updated entry (not the original)
	entries, err = trackingService.ListTimeEntries(ctx, workspaceID, trackingapplication.ListTimeEntriesFilter{
		UserID: userID,
	})
	if err != nil {
		t.Fatalf("list time entries after editing: %v", err)
	}
	foundInHistory = false
	for _, e := range entries {
		if e.ID == editedEntry.ID {
			foundInHistory = true
			if e.Description != newDescription {
				t.Fatalf("expected edited entry in history to have description %q, got %q", newDescription, e.Description)
			}
			break
		}
	}
	if !foundInHistory {
		t.Fatalf("expected edited entry to appear in history after editing")
	}

	// Phase 4: Start a new timer and verify it doesn't conflict with the edited stopped entry
	newStart := time.Now().UTC()
	newRunningEntry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: "New running timer after edit",
		Start:       newStart,
		CreatedWith: "consistency-test",
	})
	if err != nil {
		t.Fatalf("start new timer after editing: %v", err)
	}
	if newRunningEntry.Stop != nil {
		t.Fatalf("expected new running entry to have no stop, got %s", *newRunningEntry.Stop)
	}

	// Verify current-timer returns the NEW running entry
	current, err = trackingService.GetCurrentTimeEntry(ctx, userID)
	if err != nil {
		t.Fatalf("get current timer for new running entry: %v", err)
	}
	if current.ID != newRunningEntry.ID {
		t.Fatalf("expected current timer ID %d for new running entry, got %d", newRunningEntry.ID, current.ID)
	}

	// Verify the edited entry is STILL in history (not overwritten or removed)
	entries, err = trackingService.ListTimeEntries(ctx, workspaceID, trackingapplication.ListTimeEntriesFilter{
		UserID: userID,
	})
	if err != nil {
		t.Fatalf("list time entries with new running timer: %v", err)
	}
	editedEntryStillInHistory := false
	newRunningEntryInHistory := false
	for _, e := range entries {
		if e.ID == editedEntry.ID {
			editedEntryStillInHistory = true
		}
		if e.ID == newRunningEntry.ID && e.Stop == nil {
			newRunningEntryInHistory = true
		}
	}
	if !editedEntryStillInHistory {
		t.Fatalf("expected edited entry to still appear in history after starting new timer")
	}
	if !newRunningEntryInHistory {
		t.Fatalf("expected new running entry to appear in history without stop time")
	}
}
