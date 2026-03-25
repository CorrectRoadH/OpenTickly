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

// NOTE: UpdateTimeEntry is NOT a supported timer-start entry point under the current
// documented contract (OpenAPI/toggl-track-api-v9). The PUT /workspaces/{workspace_id}/time_entries/{time_entry_id}
// endpoint updates an existing time entry; it cannot be used to START a new running timer.
// When UpdateTimeEntry is called without Stop on a stopped entry, the existing stop value
// is preserved (stop != nil), so no running timer conflict can occur via this path.
//
// The only supported timer-start entry point is CreateTimeEntry (POST /workspaces/{workspace_id}/time_entries).
// VAL-REG-001 is validated by TestRunningTimerConflictOnCreateEntryPoint.

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

	// VAL-REG-001 explicit no-persistence proof: the rejected second-start attempt
	// must not have persisted a contradictory entry for the rejected description.
	// Use direct readback via ListTimeEntries to prove no entry with the rejected
	// description exists in the database.
	rejectedDescription := "Second running timer - should conflict"
	entriesAfterConflict, err := trackingService.ListTimeEntries(ctx, workspaceID, trackingapplication.ListTimeEntriesFilter{
		UserID: userID,
	})
	if err != nil {
		t.Fatalf("list time entries after conflict to verify no-persistence: %v", err)
	}
	for _, e := range entriesAfterConflict {
		if e.Description == rejectedDescription {
			t.Fatalf("rejected second-start attempt persisted entry with description %q (id=%d); VAL-REG-001 requires that the conflict result does not leave a contradictory entry", rejectedDescription, e.ID)
		}
	}

	// Also prove the entry count did not increase - only the first running entry exists.
	if len(entriesAfterConflict) != 1 {
		t.Fatalf("expected exactly 1 time entry after rejected conflict (only the first running timer), got %d entries", len(entriesAfterConflict))
	}
	if entriesAfterConflict[0].ID != firstEntry.ID {
		t.Fatalf("expected only the first running timer (id=%d) in history after conflict, got id=%d", firstEntry.ID, entriesAfterConflict[0].ID)
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

// TestRunningTimerConflictAcrossWorkspaces verifies VAL-TIMER-001:
// A user can have at most one running timer across all workspaces.
// If the user already has a running timer in workspace A and attempts to start
// another running timer in workspace B, the server rejects the second start-capable
// write with ErrRunningTimeEntryExists, no second running entry is persisted,
// and GET /me/time_entries/current still returns the original running entry.
func TestRunningTimerConflictAcrossWorkspaces(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	// Create the first workspace and user
	workspaceAID, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "cross-ws-conflict")

	// Create the second workspace
	tenantStore := tenantpostgres.NewStore(database.Pool)
	_, workspaceB, err := tenantStore.CreateOrganization(
		ctx,
		"Cross-WS Conflict Org B",
		"Cross-WS Conflict Workspace B",
		tenantdomain.DefaultWorkspaceSettings(),
	)
	if err != nil {
		t.Fatalf("create second tenant state: %v", err)
	}
	workspaceBID := int64(workspaceB.ID())

	// Add the same user to workspace B
	membershipService, err := membershipapplication.NewService(membershippostgres.NewStore(database.Pool))
	if err != nil {
		t.Fatalf("new membership service: %v", err)
	}
	_, err = membershipService.EnsureWorkspaceOwner(ctx, membershipapplication.EnsureWorkspaceOwnerCommand{
		WorkspaceID: workspaceBID,
		UserID:      userID,
	})
	if err != nil {
		t.Fatalf("ensure user membership in workspace B: %v", err)
	}

	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	// Start the first running timer in workspace A (no stop time)
	firstStart := time.Now().UTC()
	firstEntry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceAID,
		UserID:      userID,
		Description: "Running timer in workspace A",
		Start:       firstStart,
		CreatedWith: "cross-ws-conflict-test",
	})
	if err != nil {
		t.Fatalf("create first running timer in workspace A: %v", err)
	}
	if firstEntry.Stop != nil {
		t.Fatalf("expected first entry to be running (no stop), got stop %s", *firstEntry.Stop)
	}
	if firstEntry.WorkspaceID != workspaceAID {
		t.Fatalf("expected first entry workspace A (%d), got %d", workspaceAID, firstEntry.WorkspaceID)
	}

	// Verify the first timer is the current running timer
	current, err := trackingService.GetCurrentTimeEntry(ctx, userID)
	if err != nil {
		t.Fatalf("get current time entry: %v", err)
	}
	if current.ID != firstEntry.ID {
		t.Fatalf("expected current timer ID %d, got %d", firstEntry.ID, current.ID)
	}

	// Attempt to start a second running timer in workspace B - should be rejected with conflict error
	secondStart := time.Now().UTC()
	_, err = trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceBID,
		UserID:      userID,
		Description: "Second running timer in workspace B - should conflict",
		Start:       secondStart,
		CreatedWith: "cross-ws-conflict-test",
	})
	if err == nil {
		t.Fatalf("expected conflict error when starting second running timer in workspace B, got nil")
	}
	if err != trackingapplication.ErrRunningTimeEntryExists {
		t.Fatalf("expected ErrRunningTimeEntryExists, got %v", err)
	}

	// Verify the first running timer is still the current running timer
	current, err = trackingService.GetCurrentTimeEntry(ctx, userID)
	if err != nil {
		t.Fatalf("get current time entry after cross-workspace conflict: %v", err)
	}
	if current.ID != firstEntry.ID {
		t.Fatalf("expected current timer to still be first entry %d after cross-workspace conflict, got %d", firstEntry.ID, current.ID)
	}

	// VAL-TIMER-001 no-persistence proof: the rejected second-start attempt must not have
	// persisted a second running entry. Use ListTimeEntries to prove no entry with the
	// rejected description exists.
	rejectedDescription := "Second running timer in workspace B - should conflict"

	// Check workspace A entries
	entriesA, err := trackingService.ListTimeEntries(ctx, workspaceAID, trackingapplication.ListTimeEntriesFilter{
		UserID: userID,
	})
	if err != nil {
		t.Fatalf("list time entries in workspace A after conflict: %v", err)
	}
	for _, e := range entriesA {
		if e.Description == rejectedDescription {
			t.Fatalf("rejected second-start attempt persisted entry with description %q in workspace A; VAL-TIMER-001 requires no-persistence", rejectedDescription)
		}
	}

	// Check workspace B entries
	entriesB, err := trackingService.ListTimeEntries(ctx, workspaceBID, trackingapplication.ListTimeEntriesFilter{
		UserID: userID,
	})
	if err != nil {
		t.Fatalf("list time entries in workspace B after conflict: %v", err)
	}
	for _, e := range entriesB {
		if e.Description == rejectedDescription {
			t.Fatalf("rejected second-start attempt persisted entry with description %q in workspace B; VAL-TIMER-001 requires no-persistence", rejectedDescription)
		}
	}

	// Prove the original running timer is still in workspace A and running
	if len(entriesA) != 1 {
		t.Fatalf("expected exactly 1 time entry in workspace A after rejected conflict, got %d entries", len(entriesA))
	}
	if entriesA[0].ID != firstEntry.ID {
		t.Fatalf("expected only the first running timer (id=%d) in workspace A after conflict, got id=%d", firstEntry.ID, entriesA[0].ID)
	}
	if entriesA[0].Stop != nil {
		t.Fatalf("expected first timer to still be running (no stop), got stop %s", *entriesA[0].Stop)
	}

	// Prove workspace B has no entries at all after the rejected conflict
	if len(entriesB) != 0 {
		t.Fatalf("expected zero time entries in workspace B after rejected conflict, got %d entries", len(entriesB))
	}

	// Stop the first timer and verify a new timer can now be started in any workspace
	stopTime := time.Now().UTC()
	stoppedEntry, err := trackingService.UpdateTimeEntry(ctx, trackingapplication.UpdateTimeEntryCommand{
		WorkspaceID: workspaceAID,
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

	// Now we should be able to start a new running timer in workspace B
	newStart := time.Now().UTC()
	newEntry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceBID,
		UserID:      userID,
		Description: "New running timer in workspace B after stopping previous",
		Start:       newStart,
		CreatedWith: "cross-ws-conflict-test",
	})
	if err != nil {
		t.Fatalf("create running timer in workspace B after stopping previous: %v", err)
	}
	if newEntry.Stop != nil {
		t.Fatalf("expected new entry to be running, got stop %s", *newEntry.Stop)
	}
	if newEntry.WorkspaceID != workspaceBID {
		t.Fatalf("expected new entry workspace B (%d), got %d", workspaceBID, newEntry.WorkspaceID)
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
		WorkspaceID: workspaceID,
		TimeEntryID: stoppedEntry.ID,
		UserID:      userID,
		Description: &newDescription,
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
	runningEntryWithIncorrectStop := false
	for _, e := range entries {
		if e.ID == editedEntry.ID {
			editedEntryStillInHistory = true
		}
		// VAL-REG-004 contradiction guard: if the new running entry appears in history
		// with a non-nil stop time, that's a contradiction - the UI shows it as running
		// via current-timer but history shows it as stopped.
		if e.ID == newRunningEntry.ID && e.Stop != nil {
			runningEntryWithIncorrectStop = true
		}
	}
	if !editedEntryStillInHistory {
		t.Fatalf("expected edited entry to still appear in history after starting new timer")
	}
	// VAL-REG-004 contradiction guard: running entry must not appear in history with non-nil stop
	if runningEntryWithIncorrectStop {
		t.Fatalf("new running entry appears in history with non-nil stop time: current-timer shows it as running but history shows it as stopped (contradiction)")
	}

	// Phase 5: Explicit restart boundary - stop the current running entry and start a new one.
	// This proves the no-contradiction invariant holds after a full restart cycle:
	// current-timer shows the new running entry, while history shows only the stopped entries.
	restartStop := time.Now().UTC()
	stoppedForRestart, err := trackingService.UpdateTimeEntry(ctx, trackingapplication.UpdateTimeEntryCommand{
		WorkspaceID: workspaceID,
		TimeEntryID: newRunningEntry.ID,
		UserID:      userID,
		Stop:        &restartStop,
	})
	if err != nil {
		t.Fatalf("stop current running entry for restart test: %v", err)
	}
	if stoppedForRestart.Stop == nil {
		t.Fatalf("expected entry to have stop time after stopping for restart")
	}

	// Start a new running entry after the restart
	restartStart := time.Now().UTC()
	restartedEntry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: "Restarted running entry",
		Start:       restartStart,
		CreatedWith: "consistency-test",
	})
	if err != nil {
		t.Fatalf("start new entry after restart: %v", err)
	}
	if restartedEntry.Stop != nil {
		t.Fatalf("expected restarted entry to be running, got stop %s", *restartedEntry.Stop)
	}

	// Verify current-timer shows the restarted entry as running
	currentAfterRestart, err := trackingService.GetCurrentTimeEntry(ctx, userID)
	if err != nil {
		t.Fatalf("get current timer after restart: %v", err)
	}
	if currentAfterRestart.ID != restartedEntry.ID {
		t.Fatalf("expected current timer ID %d after restart, got %d", restartedEntry.ID, currentAfterRestart.ID)
	}

	// Verify history shows all stopped entries but NOT the restarted running entry.
	// The restarted entry is still running, so it must not appear in stopped history.
	// This is the core contradiction proof: current-timer shows restartedEntry as running,
	// history must not simultaneously treat it as stopped.
	entriesAfterRestart, err := trackingService.ListTimeEntries(ctx, workspaceID, trackingapplication.ListTimeEntriesFilter{
		UserID: userID,
	})
	if err != nil {
		t.Fatalf("list time entries after restart: %v", err)
	}

	stoppedEntriesInHistory := 0
	restartedEntryWithStop := false
	for _, e := range entriesAfterRestart {
		if e.Stop != nil {
			stoppedEntriesInHistory++
		}
		// VAL-REG-004 contradiction guard: if the restarted running entry appears in history
		// with a non-nil stop time, that's a contradiction - current-timer shows it as running
		// but history shows it as stopped.
		if e.ID == restartedEntry.ID && e.Stop != nil {
			restartedEntryWithStop = true
		}
	}

	// We expect 2 stopped entries in history: entry 873 (stopped in Phase 2) and entry 874
	// (stopped for restart in Phase 5). Entry 875 is the restarted entry and is still running,
	// so it should NOT be in stopped history.
	if stoppedEntriesInHistory != 2 {
		t.Fatalf("expected 2 stopped entries in history after restart, got %d", stoppedEntriesInHistory)
	}
	// VAL-REG-004 contradiction guard for restart boundary
	if restartedEntryWithStop {
		t.Fatalf("restarted running entry appears in history with non-nil stop: current-timer shows it as running but history shows it as stopped (contradiction)")
	}

	// Final invariant: current-timer and history are consistent
	// Current timer: restartedEntry (running)
	// History: shows all previous stopped entries but NOT restartedEntry (since it's still running)
	finalCurrent, err := trackingService.GetCurrentTimeEntry(ctx, userID)
	if err != nil {
		t.Fatalf("get final current timer: %v", err)
	}
	if finalCurrent.ID != restartedEntry.ID {
		t.Fatalf("final current timer should be restartedEntry %d, got %d", restartedEntry.ID, finalCurrent.ID)
	}
}
