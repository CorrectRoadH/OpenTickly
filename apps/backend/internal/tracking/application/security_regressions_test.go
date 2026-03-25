package application_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	identitydomain "opentoggl/backend/apps/backend/internal/identity/domain"
	identitypostgres "opentoggl/backend/apps/backend/internal/identity/infra/postgres"
	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"
	membershippostgres "opentoggl/backend/apps/backend/internal/membership/infra/postgres"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"
	tenantpostgres "opentoggl/backend/apps/backend/internal/tenant/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"
)

// seedTwoUsersInOneWorkspace creates a workspace with two users (owner and member)
// in the same workspace, returning workspaceID, ownerUserID, memberUserID.
// Both users can have time entries; the security tests prove they cannot read each other's data.
func seedTwoUsersInOneWorkspace(t *testing.T, ctx context.Context, database *pgtest.Database, prefix string) (workspaceID, ownerUserID, memberUserID int64) {
	t.Helper()

	tenantStore := tenantpostgres.NewStore(database.Pool)
	_, workspace, err := tenantStore.CreateOrganization(
		ctx,
		"Security Org",
		"Security Workspace",
		tenantdomain.DefaultWorkspaceSettings(),
	)
	if err != nil {
		t.Fatalf("create tenant state: %v", err)
	}
	workspaceID = int64(workspace.ID())

	// Create unique IDs based on timestamp to avoid parallel test conflicts
	baseID := time.Now().UnixNano() % 100000000000
	ownerUserID = baseID
	memberUserID = baseID + 1

	ownerEmail := fmt.Sprintf("%s-owner-%d@example.com", prefix, ownerUserID)
	memberEmail := fmt.Sprintf("%s-member-%d@example.com", prefix, memberUserID)

	// Register and save owner
	owner, err := identitydomain.RegisterUser(identitydomain.RegisterParams{
		ID:       ownerUserID,
		Email:    ownerEmail,
		FullName: "Security Owner",
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
		ID:       memberUserID,
		Email:    memberEmail,
		FullName: "Security Member",
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
	_, err = membershipService.EnsureWorkspaceOwner(ctx, membershipapplication.EnsureWorkspaceOwnerCommand{
		WorkspaceID: workspaceID,
		UserID:      ownerUserID,
	})
	if err != nil {
		t.Fatalf("ensure owner membership: %v", err)
	}

	// Add member as workspace owner (both users are owners in the same workspace for security testing)
	_, err = membershipService.EnsureWorkspaceOwner(ctx, membershipapplication.EnsureWorkspaceOwnerCommand{
		WorkspaceID: workspaceID,
		UserID:      memberUserID,
	})
	if err != nil {
		t.Fatalf("ensure member membership: %v", err)
	}

	return workspaceID, ownerUserID, memberUserID
}

// TestSameWorkspaceUserACannotReadUserBCurrentTimer verifies VAL-SEC-TRACK-001:
// If user A and user B belong to the same workspace, user A cannot read user B's
// current running timer through tracking read surfaces. Requests scoped to user A
// must not expose user B's current timer identity, timing fields, or description.
func TestSameWorkspaceUserACannotReadUserBCurrentTimer(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, ownerID, memberID := seedTwoUsersInOneWorkspace(t, ctx, database, "sec-current-timer")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	// User B (member) starts a running timer
	memberStart := time.Now().UTC()
	memberEntry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      memberID,
		Description: "User B's secret running timer",
		Start:       memberStart,
		CreatedWith: "security-test",
	})
	if err != nil {
		t.Fatalf("user B create running timer: %v", err)
	}
	if memberEntry.Stop != nil {
		t.Fatalf("expected user B entry to be running (no stop), got stop %s", *memberEntry.Stop)
	}

	// Verify user B's current timer is accessible to user B
	memberCurrent, err := trackingService.GetCurrentTimeEntry(ctx, memberID)
	if err != nil {
		t.Fatalf("get user B current timer: %v", err)
	}
	if memberCurrent.ID != memberEntry.ID {
		t.Fatalf("user B should see their own running timer ID %d, got %d", memberEntry.ID, memberCurrent.ID)
	}
	if memberCurrent.Description != "User B's secret running timer" {
		t.Fatalf("user B should see their own description, got %q", memberCurrent.Description)
	}

	// VAL-SEC-TRACK-001 core assertion: user A (owner) calls GetCurrentTimeEntry
	// and must NOT see user B's running timer. The result should be null/empty (ID == 0).
	ownerCurrent, err := trackingService.GetCurrentTimeEntry(ctx, ownerID)
	if err != nil {
		t.Fatalf("get user A current timer: %v", err)
	}
	if ownerCurrent.ID != 0 {
		t.Fatalf("VAL-SEC-TRACK-001: user A called GetCurrentTimeEntry and got a non-null result (ID=%d, description=%q); user A must NOT see user B's current timer", ownerCurrent.ID, ownerCurrent.Description)
	}

	// Also verify via ListTimeEntries that user A does not see user B's entry
	ownerEntries, err := trackingService.ListTimeEntries(ctx, workspaceID, trackingapplication.ListTimeEntriesFilter{
		UserID: ownerID,
	})
	if err != nil {
		t.Fatalf("list user A time entries: %v", err)
	}
	for _, e := range ownerEntries {
		if e.ID == memberEntry.ID {
			t.Fatalf("VAL-SEC-TRACK-001: user A's ListTimeEntries includes user B's running entry (id=%d); cross-user timer read is not blocked", e.ID)
		}
	}

	// Prove user B's timer is still accessible to user B (not mutated/deleted)
	memberCurrentAfter, err := trackingService.GetCurrentTimeEntry(ctx, memberID)
	if err != nil {
		t.Fatalf("get user B current timer after security check: %v", err)
	}
	if memberCurrentAfter.ID != memberEntry.ID {
		t.Fatalf("user B's running timer should still be accessible after security check, got ID %d", memberCurrentAfter.ID)
	}
}

// TestSameWorkspaceUserACannotReadUserBTimeEntryHistory verifies VAL-SEC-TRACK-002:
// If user A and user B belong to the same workspace, user A cannot read user B's
// historical time entries through tracking read surfaces. History reads for user A
// must exclude user B-owned entries even when both users share the workspace.
func TestSameWorkspaceUserACannotReadUserBTimeEntryHistory(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, ownerID, memberID := seedTwoUsersInOneWorkspace(t, ctx, database, "sec-history")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	// User B creates multiple time entries (stopped)
	start1 := time.Date(2026, 3, 20, 10, 0, 0, 0, time.UTC)
	stop1 := time.Date(2026, 3, 20, 11, 30, 0, 0, time.UTC)
	memberEntry1, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      memberID,
		Description: "User B's first secret entry",
		Start:       start1,
		Stop:        &stop1,
		CreatedWith: "security-test",
	})
	if err != nil {
		t.Fatalf("user B create first entry: %v", err)
	}

	start2 := time.Date(2026, 3, 21, 14, 0, 0, 0, time.UTC)
	stop2 := time.Date(2026, 3, 21, 16, 0, 0, 0, time.UTC)
	memberEntry2, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      memberID,
		Description: "User B's second secret entry",
		Start:       start2,
		Stop:        &stop2,
		CreatedWith: "security-test",
	})
	if err != nil {
		t.Fatalf("user B create second entry: %v", err)
	}

	// Also give user A their own entry to prove user A can still read their own data
	ownerStart := time.Date(2026, 3, 20, 9, 0, 0, 0, time.UTC)
	ownerStop := time.Date(2026, 3, 20, 10, 0, 0, 0, time.UTC)
	ownerEntry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      ownerID,
		Description: "User A's own entry",
		Start:       ownerStart,
		Stop:        &ownerStop,
		CreatedWith: "security-test",
	})
	if err != nil {
		t.Fatalf("user A create own entry: %v", err)
	}

	// Verify user B can see their own entries via ListTimeEntries
	memberEntries, err := trackingService.ListTimeEntries(ctx, workspaceID, trackingapplication.ListTimeEntriesFilter{
		UserID: memberID,
	})
	if err != nil {
		t.Fatalf("list user B entries: %v", err)
	}
	if len(memberEntries) != 2 {
		t.Fatalf("user B should see 2 entries, got %d", len(memberEntries))
	}

	// VAL-SEC-TRACK-002 core assertion: user A's ListTimeEntries must NOT include
	// user B's entries. User A should only see their own entry.
	ownerEntries, err := trackingService.ListTimeEntries(ctx, workspaceID, trackingapplication.ListTimeEntriesFilter{
		UserID: ownerID,
	})
	if err != nil {
		t.Fatalf("list user A entries: %v", err)
	}

	// User A should see exactly 1 entry (their own)
	if len(ownerEntries) != 1 {
		t.Fatalf("VAL-SEC-TRACK-002: user A should see exactly 1 entry (their own), got %d entries", len(ownerEntries))
	}
	if ownerEntries[0].ID != ownerEntry.ID {
		t.Fatalf("VAL-SEC-TRACK-002: user A's only entry should be their own (id=%d), got id=%d", ownerEntry.ID, ownerEntries[0].ID)
	}
	if ownerEntries[0].Description != "User A's own entry" {
		t.Fatalf("VAL-SEC-TRACK-002: user A's entry should have their own description, got %q", ownerEntries[0].Description)
	}

	// Verify user B's entries are NOT in user A's list
	for _, e := range ownerEntries {
		if e.ID == memberEntry1.ID || e.ID == memberEntry2.ID {
			t.Fatalf("VAL-SEC-TRACK-002: user A's ListTimeEntries includes user B's entry (id=%d, description=%q); cross-user history read is not blocked", e.ID, e.Description)
		}
	}

	// VAL-SEC-TRACK-002 also via ListUserTimeEntries (user-scoped, no workspace needed)
	ownerUserEntries, err := trackingService.ListUserTimeEntries(ctx, trackingapplication.ListTimeEntriesFilter{
		UserID: ownerID,
	})
	if err != nil {
		t.Fatalf("list user A user-scoped entries: %v", err)
	}
	if len(ownerUserEntries) != 1 {
		t.Fatalf("VAL-SEC-TRACK-002 (user-scoped): user A should see exactly 1 entry, got %d", len(ownerUserEntries))
	}
	if ownerUserEntries[0].ID != ownerEntry.ID {
		t.Fatalf("VAL-SEC-TRACK-002 (user-scoped): user A's only entry should be their own, got id=%d", ownerUserEntries[0].ID)
	}

	// Prove user B's entries are still readable to user B (not mutated/deleted)
	memberEntriesAfter, err := trackingService.ListTimeEntries(ctx, workspaceID, trackingapplication.ListTimeEntriesFilter{
		UserID: memberID,
	})
	if err != nil {
		t.Fatalf("list user B entries after security check: %v", err)
	}
	if len(memberEntriesAfter) != 2 {
		t.Fatalf("user B should still see 2 entries after security check, got %d", len(memberEntriesAfter))
	}
}

// TestOwnerCanStillReadOwnTimerAndHistory proves the "owner can still read their own"
// requirement from the feature expectedBehavior. In the same seeded scenario where
// user B has data, user A must not see user B's data BUT user A must still be able
// to read their own timer and history facts.
func TestOwnerCanStillReadOwnTimerAndHistory(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, ownerID, memberID := seedTwoUsersInOneWorkspace(t, ctx, database, "sec-owner-access")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	// User B has a running timer
	memberStart := time.Now().UTC()
	memberEntry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      memberID,
		Description: "User B's running timer",
		Start:       memberStart,
		CreatedWith: "security-test",
	})
	if err != nil {
		t.Fatalf("user B create running timer: %v", err)
	}

	// User A starts their own running timer
	ownerStart := time.Now().UTC()
	ownerEntry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      ownerID,
		Description: "User A's own running timer",
		Start:       ownerStart,
		CreatedWith: "security-test",
	})
	if err != nil {
		t.Fatalf("user A create running timer: %v", err)
	}

	// User A must see their own current timer (not user B's)
	ownerCurrent, err := trackingService.GetCurrentTimeEntry(ctx, ownerID)
	if err != nil {
		t.Fatalf("get user A current timer: %v", err)
	}
	if ownerCurrent.ID != ownerEntry.ID {
		t.Fatalf("user A should see their own running timer ID %d, got %d", ownerEntry.ID, ownerCurrent.ID)
	}
	if ownerCurrent.Description != "User A's own running timer" {
		t.Fatalf("user A should see their own description, got %q", ownerCurrent.Description)
	}

	// User A creates a stopped entry
	start := time.Date(2026, 3, 22, 8, 0, 0, 0, time.UTC)
	stop := time.Date(2026, 3, 22, 9, 0, 0, 0, time.UTC)
	ownerStoppedEntry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      ownerID,
		Description: "User A's stopped entry",
		Start:       start,
		Stop:        &stop,
		CreatedWith: "security-test",
	})
	if err != nil {
		t.Fatalf("user A create stopped entry: %v", err)
	}

	// User A must see their own history entries
	ownerEntries, err := trackingService.ListTimeEntries(ctx, workspaceID, trackingapplication.ListTimeEntriesFilter{
		UserID: ownerID,
	})
	if err != nil {
		t.Fatalf("list user A entries: %v", err)
	}
	if len(ownerEntries) != 2 {
		t.Fatalf("user A should see 2 entries (1 running + 1 stopped), got %d", len(ownerEntries))
	}

	// Verify user A's entries are exactly their own
	for _, e := range ownerEntries {
		if e.UserID != ownerID {
			t.Fatalf("user A's ListTimeEntries includes entry with userID=%d, expected only userID=%d", e.UserID, ownerID)
		}
		if e.ID == memberEntry.ID {
			t.Fatalf("user A's entries include user B's running entry (id=%d); owner read is not properly scoped", e.ID)
		}
	}

	// Verify via direct readback that user A can read their own stopped entry
	ownerReadback, err := trackingService.GetTimeEntry(ctx, workspaceID, ownerID, ownerStoppedEntry.ID)
	if err != nil {
		t.Fatalf("user A direct readback of own entry: %v", err)
	}
	if ownerReadback.ID != ownerStoppedEntry.ID {
		t.Fatalf("user A direct readback should return own entry ID %d, got %d", ownerStoppedEntry.ID, ownerReadback.ID)
	}
	if ownerReadback.Description != "User A's stopped entry" {
		t.Fatalf("user A direct readback should return own description, got %q", ownerReadback.Description)
	}

	// Prove user B's data is completely inaccessible to user A via direct readback attempt
	// (trying to read user B's entry with user A's userID should not work, but we test the
	// service method's behavior - it returns the entry if userID matches the caller, not the owner)
	// The GetTimeEntry method takes workspaceID and userID as parameters, so calling with
	// ownerID should only return ownerID's entries. We verify user B's entry is not returned.
	bEntryReadback, err := trackingService.GetTimeEntry(ctx, workspaceID, ownerID, memberEntry.ID)
	if err != nil {
		// If it returns an error (not found), that's correct behavior - user A can't read user B's entry
		// The implementation should either return error or not find it
		t.Logf("GetTimeEntry correctly denied user A access to user B's entry: %v", err)
	} else {
		// If it returned an entry, it should NOT be user B's entry
		if bEntryReadback.ID == memberEntry.ID {
			t.Fatalf("user A direct readback with user A's userID returned user B's entry (id=%d); direct readback is not properly scoped", bEntryReadback.ID)
		}
	}

	// Verify user B's data is still intact
	memberCurrent, err := trackingService.GetCurrentTimeEntry(ctx, memberID)
	if err != nil {
		t.Fatalf("user B current timer after security checks: %v", err)
	}
	if memberCurrent.ID != memberEntry.ID {
		t.Fatalf("user B's running timer should still be accessible, got ID %d", memberCurrent.ID)
	}
}

// TestSameWorkspaceUserACannotUpdateUserBTimeEntry verifies VAL-SEC-TRACK-003:
// If user A and user B belong to the same workspace, user A cannot update
// user B-owned time entries through the tracking write routes.
// A denied write must leave the canonical stored facts for user B unchanged.
func TestSameWorkspaceUserACannotUpdateUserBTimeEntry(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, ownerID, memberID := seedTwoUsersInOneWorkspace(t, ctx, database, "sec-update")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	// User B creates a stopped time entry
	start := time.Date(2026, 3, 23, 10, 0, 0, 0, time.UTC)
	stop := time.Date(2026, 3, 23, 11, 0, 0, 0, time.UTC)
	memberEntry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      memberID,
		Description: "User B's original description",
		Start:       start,
		Stop:        &stop,
		CreatedWith: "security-test",
	})
	if err != nil {
		t.Fatalf("user B create entry: %v", err)
	}
	originalDescription := memberEntry.Description
	originalStart := memberEntry.Start
	originalStop := *memberEntry.Stop
	originalDuration := memberEntry.Duration

	// VAL-SEC-TRACK-003: user A (owner) attempts to update user B's entry
	// using user A's userID - this must be denied.
	newDescription := "User A's malicious update attempt"
	_, err = trackingService.UpdateTimeEntry(ctx, trackingapplication.UpdateTimeEntryCommand{
		WorkspaceID: workspaceID,
		TimeEntryID: memberEntry.ID,
		UserID:      ownerID, // Attacker using their own userID
		Description: &newDescription,
	})
	// The write must be denied - either by returning an error or by not mutating the entry.
	// If it returns ErrTimeEntryNotFound, that's the correct denial (authorization failure
	// returns the same error as not found to avoid information leakage).
	if err != nil && err != trackingapplication.ErrTimeEntryNotFound {
		t.Fatalf("UpdateTimeEntry with attacker userID should return error, got: %v", err)
	}

	// VAL-SEC-TRACK-003 core assertion: direct readback proves user B's entry is unchanged.
	// Use user B's own userID to read the entry - if the entry was mutated,
	// the description would have changed.
	memberReadback, err := trackingService.GetTimeEntry(ctx, workspaceID, memberID, memberEntry.ID)
	if err != nil {
		t.Fatalf("user B direct readback after denied update: %v", err)
	}
	if memberReadback.Description != originalDescription {
		t.Fatalf("VAL-SEC-TRACK-003: user B's entry description was changed by attacker update; expected %q, got %q", originalDescription, memberReadback.Description)
	}
	if !memberReadback.Start.Equal(originalStart) {
		t.Fatalf("VAL-SEC-TRACK-003: user B's entry start was changed; expected %s, got %s", originalStart, memberReadback.Start)
	}
	if memberReadback.Stop == nil || !memberReadback.Stop.Equal(originalStop) {
		expectedStop := originalStop
		t.Fatalf("VAL-SEC-TRACK-003: user B's entry stop was changed; expected %s, got %#v", expectedStop, memberReadback.Stop)
	}
	if memberReadback.Duration != originalDuration {
		t.Fatalf("VAL-SEC-TRACK-003: user B's entry duration was changed; expected %d, got %d", originalDuration, memberReadback.Duration)
	}

	// Also verify via ListTimeEntries that user B's entry count and data are intact
	memberEntries, err := trackingService.ListTimeEntries(ctx, workspaceID, trackingapplication.ListTimeEntriesFilter{
		UserID: memberID,
	})
	if err != nil {
		t.Fatalf("list user B entries after denied update: %v", err)
	}
	if len(memberEntries) != 1 {
		t.Fatalf("VAL-SEC-TRACK-003: user B should still have exactly 1 entry, got %d", len(memberEntries))
	}
	if memberEntries[0].Description != originalDescription {
		t.Fatalf("VAL-SEC-TRACK-003: user B's entry in list has wrong description; expected %q, got %q", originalDescription, memberEntries[0].Description)
	}

	// Verify user A's entry list is still empty (attacker gained no new access)
	ownerEntries, err := trackingService.ListTimeEntries(ctx, workspaceID, trackingapplication.ListTimeEntriesFilter{
		UserID: ownerID,
	})
	if err != nil {
		t.Fatalf("list user A entries after denied update: %v", err)
	}
	if len(ownerEntries) != 0 {
		t.Fatalf("user A should not see user B's entry in their own list, got %d entries", len(ownerEntries))
	}
}

// TestSameWorkspaceUserACannotStopUserBTimeEntry verifies VAL-SEC-TRACK-003:
// If user A and user B belong to the same workspace, user A cannot stop
// user B's running timer through the tracking write routes.
// A denied write must leave the canonical stored facts for user B unchanged.
func TestSameWorkspaceUserACannotStopUserBTimeEntry(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, ownerID, memberID := seedTwoUsersInOneWorkspace(t, ctx, database, "sec-stop")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	// User B creates a running timer
	memberStart := time.Now().UTC()
	memberEntry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      memberID,
		Description: "User B's running timer",
		Start:       memberStart,
		CreatedWith: "security-test",
	})
	if err != nil {
		t.Fatalf("user B create running timer: %v", err)
	}
	if memberEntry.Stop != nil {
		t.Fatalf("user B's entry should be running (no stop)")
	}

	// Verify user B's current timer is accessible to user B
	memberCurrentBefore, err := trackingService.GetCurrentTimeEntry(ctx, memberID)
	if err != nil {
		t.Fatalf("user B get current timer before security check: %v", err)
	}
	if memberCurrentBefore.ID != memberEntry.ID {
		t.Fatalf("user B should see their own running timer ID %d, got %d", memberEntry.ID, memberCurrentBefore.ID)
	}

	// VAL-SEC-TRACK-003: user A (owner) attempts to stop user B's running timer
	// using user A's userID - this must be denied.
	_, err = trackingService.StopTimeEntry(ctx, workspaceID, ownerID, memberEntry.ID)
	// The write must be denied - StopTimeEntry internally calls UpdateTimeEntry which
	// will fail with ErrTimeEntryNotFound when userID doesn't match.
	if err != nil && err != trackingapplication.ErrTimeEntryNotFound {
		t.Fatalf("StopTimeEntry with attacker userID should return error, got: %v", err)
	}

	// VAL-SEC-TRACK-003 core assertion: direct readback proves user B's entry is still running.
	// Use user B's own userID to read - if the timer was stopped, Stop would be non-nil.
	memberReadback, err := trackingService.GetTimeEntry(ctx, workspaceID, memberID, memberEntry.ID)
	if err != nil {
		t.Fatalf("user B direct readback after denied stop: %v", err)
	}
	if memberReadback.Stop != nil {
		t.Fatalf("VAL-SEC-TRACK-003: user B's running timer was stopped by attacker; Stop should be nil, got %s", *memberReadback.Stop)
	}

	// Also verify via GetCurrentTimeEntry that user B's timer is still current/running
	memberCurrentAfter, err := trackingService.GetCurrentTimeEntry(ctx, memberID)
	if err != nil {
		t.Fatalf("user B get current timer after denied stop: %v", err)
	}
	if memberCurrentAfter.ID != memberEntry.ID {
		t.Fatalf("VAL-SEC-TRACK-003: user B's running timer should still be current, got ID %d", memberCurrentAfter.ID)
	}
	if memberCurrentAfter.Description != "User B's running timer" {
		t.Fatalf("VAL-SEC-TRACK-003: user B's running timer description was changed; expected %q, got %q", "User B's running timer", memberCurrentAfter.Description)
	}

	// Verify user A's current timer is still null (attacker cannot see/control user B's timer)
	ownerCurrent, err := trackingService.GetCurrentTimeEntry(ctx, ownerID)
	if err != nil {
		t.Fatalf("user A get current timer after denied stop: %v", err)
	}
	if ownerCurrent.ID != 0 {
		t.Fatalf("user A's current timer should be null/empty, got ID %d", ownerCurrent.ID)
	}
}

// TestSameWorkspaceUserACannotDeleteUserBTimeEntry verifies VAL-SEC-TRACK-003:
// If user A and user B belong to the same workspace, user A cannot delete
// user B-owned time entries through the tracking write routes.
// A denied write must leave the canonical stored facts for user B unchanged.
func TestSameWorkspaceUserACannotDeleteUserBTimeEntry(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, ownerID, memberID := seedTwoUsersInOneWorkspace(t, ctx, database, "sec-delete")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	// User B creates a stopped time entry
	start := time.Date(2026, 3, 23, 10, 0, 0, 0, time.UTC)
	stop := time.Date(2026, 3, 23, 11, 0, 0, 0, time.UTC)
	memberEntry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      memberID,
		Description: "User B's entry to delete",
		Start:       start,
		Stop:        &stop,
		CreatedWith: "security-test",
	})
	if err != nil {
		t.Fatalf("user B create entry: %v", err)
	}

	// VAL-SEC-TRACK-003: user A (owner) attempts to delete user B's entry
	// using user A's userID - this must be denied.
	err = trackingService.DeleteTimeEntry(ctx, workspaceID, ownerID, memberEntry.ID)
	// The write must be denied - DeleteTimeEntry internally checks user_id in WHERE clause.
	if err != nil && err != trackingapplication.ErrTimeEntryNotFound {
		t.Fatalf("DeleteTimeEntry with attacker userID should return error, got: %v", err)
	}

	// VAL-SEC-TRACK-003 core assertion: direct readback proves user B's entry still exists.
	// If the delete had succeeded, GetTimeEntry would return error or nil entry.
	memberReadback, err := trackingService.GetTimeEntry(ctx, workspaceID, memberID, memberEntry.ID)
	if err != nil {
		t.Fatalf("VAL-SEC-TRACK-003: user B's entry was deleted by attacker; GetTimeEntry returned error: %v", err)
	}
	if memberReadback.ID != memberEntry.ID {
		t.Fatalf("VAL-SEC-TRACK-003: user B's entry was deleted; expected ID %d, got %d", memberEntry.ID, memberReadback.ID)
	}
	if memberReadback.Description != "User B's entry to delete" {
		t.Fatalf("VAL-SEC-TRACK-003: user B's entry was modified; expected description %q, got %q", "User B's entry to delete", memberReadback.Description)
	}

	// Also verify via ListTimeEntries that user B's entry is still in the list
	memberEntries, err := trackingService.ListTimeEntries(ctx, workspaceID, trackingapplication.ListTimeEntriesFilter{
		UserID: memberID,
	})
	if err != nil {
		t.Fatalf("list user B entries after denied delete: %v", err)
	}
	if len(memberEntries) != 1 {
		t.Fatalf("VAL-SEC-TRACK-003: user B should still have exactly 1 entry after denied delete, got %d", len(memberEntries))
	}
	if memberEntries[0].ID != memberEntry.ID {
		t.Fatalf("VAL-SEC-TRACK-003: user B's entry ID changed after denied delete; expected %d, got %d", memberEntry.ID, memberEntries[0].ID)
	}

	// Verify user A's entry list is still empty (attacker gained no new access)
	ownerEntries, err := trackingService.ListTimeEntries(ctx, workspaceID, trackingapplication.ListTimeEntriesFilter{
		UserID: ownerID,
	})
	if err != nil {
		t.Fatalf("list user A entries after denied delete: %v", err)
	}
	if len(ownerEntries) != 0 {
		t.Fatalf("user A should not see any entries in their own list, got %d entries", len(ownerEntries))
	}
}

// TestSameWorkspaceUserACannotPatchUserBTimeEntries verifies VAL-SEC-TRACK-004:
// If a same-workspace attacker submits a batch or multi-entry tracking mutation
// that targets another user's entries, the denial must happen without partial
// mutation. None of the targeted unauthorized entries may be changed.
func TestSameWorkspaceUserACannotPatchUserBTimeEntries(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, ownerID, memberID := seedTwoUsersInOneWorkspace(t, ctx, database, "sec-patch")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	// User B creates multiple stopped time entries
	start1 := time.Date(2026, 3, 23, 10, 0, 0, 0, time.UTC)
	stop1 := time.Date(2026, 3, 23, 11, 0, 0, 0, time.UTC)
	memberEntry1, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      memberID,
		Description: "User B's first entry",
		Start:       start1,
		Stop:        &stop1,
		CreatedWith: "security-test",
	})
	if err != nil {
		t.Fatalf("user B create first entry: %v", err)
	}

	start2 := time.Date(2026, 3, 23, 14, 0, 0, 0, time.UTC)
	stop2 := time.Date(2026, 3, 23, 15, 0, 0, 0, time.UTC)
	memberEntry2, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      memberID,
		Description: "User B's second entry",
		Start:       start2,
		Stop:        &stop2,
		CreatedWith: "security-test",
	})
	if err != nil {
		t.Fatalf("user B create second entry: %v", err)
	}

	// User A also has their own entry
	ownerStart := time.Date(2026, 3, 23, 9, 0, 0, 0, time.UTC)
	ownerStop := time.Date(2026, 3, 23, 9, 30, 0, 0, time.UTC)
	ownerEntry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      ownerID,
		Description: "User A's own entry",
		Start:       ownerStart,
		Stop:        &ownerStop,
		CreatedWith: "security-test",
	})
	if err != nil {
		t.Fatalf("user A create own entry: %v", err)
	}

	// Capture original state of user B's entries for no-mutation proof
	originalMemberEntry1Desc := memberEntry1.Description
	originalMemberEntry2Desc := memberEntry2.Description

	// VAL-SEC-TRACK-004: user A attempts to patch user B's entries along with their own.
	// The batch includes user B's entries (which should be denied) and user A's own entry.
	attackerPatchDescription := "Attacker patched description"
	patches := []trackingapplication.TimeEntryPatch{
		{Op: "replace", Path: "/description", Value: attackerPatchDescription},
	}

	// Call PatchTimeEntries with user A's userID but targeting user B's entry IDs.
	// This tests whether the batch operation partially applies to user A's own entry
	// while denying user B's entries, or whether it fails atomically.
	_, err = trackingService.PatchTimeEntries(ctx, workspaceID, ownerID, []int64{memberEntry1.ID, ownerEntry.ID}, patches)

	// PatchTimeEntries calls UpdateTimeEntry for each ID in sequence.
	// If it hits user B's entry first, UpdateTimeEntry will return ErrTimeEntryNotFound
	// (because userID=ownerID doesn't match user B's entry owner), and the batch stops.
	// Either the entire batch fails, or it must not partially apply.
	if err != nil && err != trackingapplication.ErrTimeEntryNotFound {
		t.Fatalf("PatchTimeEntries with mixed attacker/target IDs should return error, got: %v", err)
	}

	// VAL-SEC-TRACK-004 core assertion: direct readback of ALL targeted user B entries
	// proves no partial mutation occurred.
	memberReadback1, err := trackingService.GetTimeEntry(ctx, workspaceID, memberID, memberEntry1.ID)
	if err != nil {
		t.Fatalf("user B direct readback of entry 1 after denied patch: %v", err)
	}
	if memberReadback1.Description != originalMemberEntry1Desc {
		t.Fatalf("VAL-SEC-TRACK-004: user B's entry 1 description was changed by attacker batch; expected %q, got %q", originalMemberEntry1Desc, memberReadback1.Description)
	}

	memberReadback2, err := trackingService.GetTimeEntry(ctx, workspaceID, memberID, memberEntry2.ID)
	if err != nil {
		t.Fatalf("user B direct readback of entry 2 after denied patch: %v", err)
	}
	if memberReadback2.Description != originalMemberEntry2Desc {
		t.Fatalf("VAL-SEC-TRACK-004: user B's entry 2 description was changed by attacker batch; expected %q, got %q", originalMemberEntry2Desc, memberReadback2.Description)
	}

	// Also verify entry counts are unchanged - no entries were silently deleted
	memberEntries, err := trackingService.ListTimeEntries(ctx, workspaceID, trackingapplication.ListTimeEntriesFilter{
		UserID: memberID,
	})
	if err != nil {
		t.Fatalf("list user B entries after denied patch: %v", err)
	}
	if len(memberEntries) != 2 {
		t.Fatalf("VAL-SEC-TRACK-004: user B should still have exactly 2 entries, got %d", len(memberEntries))
	}

	// Verify user A's own entry is also intact (batch didn't partially apply to anything)
	ownerReadback, err := trackingService.GetTimeEntry(ctx, workspaceID, ownerID, ownerEntry.ID)
	if err != nil {
		t.Fatalf("user A direct readback of own entry after denied patch: %v", err)
	}
	if ownerReadback.ID != ownerEntry.ID {
		t.Fatalf("user A's own entry ID changed; expected %d, got %d", ownerEntry.ID, ownerReadback.ID)
	}
	// Note: If the patch was partially applied to ownerEntry before failing on memberEntry1,
	// ownerReadback.Description would be attackerPatchDescription. We check this is NOT the case.
	if ownerReadback.Description == attackerPatchDescription {
		t.Fatalf("VAL-SEC-TRACK-004: user A's own entry was partially mutated by failed batch; description changed to attacker value %q", attackerPatchDescription)
	}
}

// TestSameWorkspaceUserACannotRestartUserBTimeEntry verifies VAL-SEC-TRACK-003:
// If user A and user B belong to the same workspace, user A cannot restart
// user B's stopped time entry through the tracking write routes.
// "Restart" means calling UpdateTimeEntry with Stop=nil to clear the stop time
// and turn a stopped entry back into a running timer.
// A denied write must leave the canonical stored facts for user B unchanged.
func TestSameWorkspaceUserACannotRestartUserBTimeEntry(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, ownerID, memberID := seedTwoUsersInOneWorkspace(t, ctx, database, "sec-restart")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	// User B creates a stopped time entry
	start := time.Date(2026, 3, 23, 10, 0, 0, 0, time.UTC)
	stop := time.Date(2026, 3, 23, 11, 0, 0, 0, time.UTC)
	memberEntry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      memberID,
		Description: "User B's stopped entry to restart",
		Start:       start,
		Stop:        &stop,
		CreatedWith: "security-test",
	})
	if err != nil {
		t.Fatalf("user B create stopped entry: %v", err)
	}
	if memberEntry.Stop == nil {
		t.Fatalf("user B's entry should have a stop time")
	}
	originalStop := *memberEntry.Stop

	// Verify user B's current timer is null (idle state) before restart attempt
	memberCurrentBefore, err := trackingService.GetCurrentTimeEntry(ctx, memberID)
	if err != nil {
		t.Fatalf("user B get current timer before restart attempt: %v", err)
	}
	if memberCurrentBefore.ID != 0 {
		t.Fatalf("user B should have no running timer before restart attempt, got ID %d", memberCurrentBefore.ID)
	}

	// VAL-SEC-TRACK-003: user A (owner) attempts to restart user B's stopped entry
	// by calling UpdateTimeEntry with Stop=nil (to clear the stop time and make it running).
	// This must be denied because GetTimeEntry requires (workspaceID, userID, timeEntryID)
	// to match - user A's userID won't find user B's entry.
	_, err = trackingService.UpdateTimeEntry(ctx, trackingapplication.UpdateTimeEntryCommand{
		WorkspaceID: workspaceID,
		TimeEntryID: memberEntry.ID,
		UserID:      ownerID, // Attacker using their own userID
		Stop:        nil,     // nil to attempt to clear stop and restart
	})
	// The write must be denied - GetTimeEntry won't find user B's entry with user A's userID.
	if err != nil && err != trackingapplication.ErrTimeEntryNotFound {
		t.Fatalf("UpdateTimeEntry with attacker userID (restart attempt) should return error, got: %v", err)
	}

	// VAL-SEC-TRACK-003 core assertion: direct readback proves user B's entry is still stopped.
	// If the restart had succeeded, Stop would be nil and the entry would be running.
	memberReadback, err := trackingService.GetTimeEntry(ctx, workspaceID, memberID, memberEntry.ID)
	if err != nil {
		t.Fatalf("user B direct readback after denied restart: %v", err)
	}
	if memberReadback.Stop == nil {
		t.Fatalf("VAL-SEC-TRACK-003: user B's entry was restarted by attacker; Stop should still be set, got nil")
	}
	if !memberReadback.Stop.Equal(originalStop) {
		t.Fatalf("VAL-SEC-TRACK-003: user B's entry stop time was changed by attacker restart attempt; expected %s, got %s", originalStop, *memberReadback.Stop)
	}

	// Also verify via GetCurrentTimeEntry that user B still has no running timer
	// (the denied restart did not create a running timer for user B)
	memberCurrentAfter, err := trackingService.GetCurrentTimeEntry(ctx, memberID)
	if err != nil {
		t.Fatalf("user B get current timer after denied restart: %v", err)
	}
	if memberCurrentAfter.ID != 0 {
		t.Fatalf("VAL-SEC-TRACK-003: user B has a running timer after denied restart; expected null/ID=0, got ID %d", memberCurrentAfter.ID)
	}

	// Verify user A's current timer is still null (attacker cannot see/control user B's state)
	ownerCurrent, err := trackingService.GetCurrentTimeEntry(ctx, ownerID)
	if err != nil {
		t.Fatalf("user A get current timer after denied restart: %v", err)
	}
	if ownerCurrent.ID != 0 {
		t.Fatalf("user A's current timer should be null/empty after denied restart, got ID %d", ownerCurrent.ID)
	}
}

// TestSameWorkspaceUserACannotContinueUserBTimeEntry verifies VAL-SEC-TRACK-003:
// If user A and user B belong to the same workspace, user A cannot "continue"
// user B's stopped time entry by modifying it to be running.
// This tests the case where the attacker provides a new Start time without a Stop
// to try to turn a stopped entry into a running timer.
// A denied write must leave the canonical stored facts for user B unchanged.
func TestSameWorkspaceUserACannotContinueUserBTimeEntry(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, ownerID, memberID := seedTwoUsersInOneWorkspace(t, ctx, database, "sec-continue")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	// User B creates a stopped time entry
	start := time.Date(2026, 3, 23, 10, 0, 0, 0, time.UTC)
	stop := time.Date(2026, 3, 23, 11, 0, 0, 0, time.UTC)
	memberEntry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      memberID,
		Description: "User B's stopped entry to continue",
		Start:       start,
		Stop:        &stop,
		CreatedWith: "security-test",
	})
	if err != nil {
		t.Fatalf("user B create stopped entry: %v", err)
	}
	if memberEntry.Stop == nil {
		t.Fatalf("user B's entry should have a stop time")
	}
	originalStop := *memberEntry.Stop

	// Verify user B's current timer is null (idle state) before continue attempt
	memberCurrentBefore, err := trackingService.GetCurrentTimeEntry(ctx, memberID)
	if err != nil {
		t.Fatalf("user B get current timer before continue attempt: %v", err)
	}
	if memberCurrentBefore.ID != 0 {
		t.Fatalf("user B should have no running timer before continue attempt, got ID %d", memberCurrentBefore.ID)
	}

	// VAL-SEC-TRACK-003: user A (owner) attempts to "continue" user B's stopped entry
	// by calling UpdateTimeEntry with a new Start time but no Stop (to make it running).
	// This must be denied because GetTimeEntry requires (workspaceID, userID, timeEntryID)
	// to match - user A's userID won't find user B's entry.
	newStart := time.Now().UTC()
	_, err = trackingService.UpdateTimeEntry(ctx, trackingapplication.UpdateTimeEntryCommand{
		WorkspaceID: workspaceID,
		TimeEntryID: memberEntry.ID,
		UserID:      ownerID, // Attacker using their own userID
		Start:       &newStart,
		Stop:        nil, // nil to attempt to make it a running entry
	})
	// The write must be denied - GetTimeEntry won't find user B's entry with user A's userID.
	if err != nil && err != trackingapplication.ErrTimeEntryNotFound {
		t.Fatalf("UpdateTimeEntry with attacker userID (continue attempt) should return error, got: %v", err)
	}

	// VAL-SEC-TRACK-003 core assertion: direct readback proves user B's entry is still stopped.
	// If the continue had succeeded, Stop would be nil and the entry would be running.
	memberReadback, err := trackingService.GetTimeEntry(ctx, workspaceID, memberID, memberEntry.ID)
	if err != nil {
		t.Fatalf("user B direct readback after denied continue: %v", err)
	}
	if memberReadback.Stop == nil {
		t.Fatalf("VAL-SEC-TRACK-003: user B's entry was continued by attacker; Stop should still be set, got nil")
	}
	if !memberReadback.Stop.Equal(originalStop) {
		t.Fatalf("VAL-SEC-TRACK-003: user B's entry stop time was changed by attacker continue attempt; expected %s, got %s", originalStop, *memberReadback.Stop)
	}

	// Also verify via GetCurrentTimeEntry that user B still has no running timer
	// (the denied continue did not create a running timer for user B)
	memberCurrentAfter, err := trackingService.GetCurrentTimeEntry(ctx, memberID)
	if err != nil {
		t.Fatalf("user B get current timer after denied continue: %v", err)
	}
	if memberCurrentAfter.ID != 0 {
		t.Fatalf("VAL-SEC-TRACK-003: user B has a running timer after denied continue; expected null/ID=0, got ID %d", memberCurrentAfter.ID)
	}

	// Verify user A's current timer is still null (attacker cannot see/control user B's state)
	ownerCurrent, err := trackingService.GetCurrentTimeEntry(ctx, ownerID)
	if err != nil {
		t.Fatalf("user A get current timer after denied continue: %v", err)
	}
	if ownerCurrent.ID != 0 {
		t.Fatalf("user A's current timer should be null/empty after denied continue, got ID %d", ownerCurrent.ID)
	}
}

// TestSameWorkspaceBatchMutationExcludesUnauthorizedEntries verifies VAL-SEC-TRACK-004:
// A batch mutation that contains only unauthorized targets must not partially apply
// any of them. The entire batch must fail with no mutation.
func TestSameWorkspaceBatchMutationExcludesUnauthorizedEntries(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, ownerID, memberID := seedTwoUsersInOneWorkspace(t, ctx, database, "sec-batch-only")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	// User B creates two stopped time entries
	start1 := time.Date(2026, 3, 23, 10, 0, 0, 0, time.UTC)
	stop1 := time.Date(2026, 3, 23, 11, 0, 0, 0, time.UTC)
	memberEntry1, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      memberID,
		Description: "User B's first entry",
		Start:       start1,
		Stop:        &stop1,
		CreatedWith: "security-test",
	})
	if err != nil {
		t.Fatalf("user B create first entry: %v", err)
	}

	start2 := time.Date(2026, 3, 23, 14, 0, 0, 0, time.UTC)
	stop2 := time.Date(2026, 3, 23, 15, 0, 0, 0, time.UTC)
	memberEntry2, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      memberID,
		Description: "User B's second entry",
		Start:       start2,
		Stop:        &stop2,
		CreatedWith: "security-test",
	})
	if err != nil {
		t.Fatalf("user B create second entry: %v", err)
	}

	// Capture original state
	originalMemberEntry1Desc := memberEntry1.Description
	originalMemberEntry2Desc := memberEntry2.Description

	// VAL-SEC-TRACK-004: user A attempts to patch ONLY user B's entries
	attackerPatchDescription := "Attacker patched"
	patches := []trackingapplication.TimeEntryPatch{
		{Op: "replace", Path: "/description", Value: attackerPatchDescription},
	}

	// Call PatchTimeEntries targeting only user B's entries with user A's userID
	_, err = trackingService.PatchTimeEntries(ctx, workspaceID, ownerID, []int64{memberEntry1.ID, memberEntry2.ID}, patches)

	// The batch must be denied - all targeted entries belong to user B
	if err == nil {
		t.Fatalf("PatchTimeEntries with only unauthorized targets should return error, got nil")
	}
	if err != trackingapplication.ErrTimeEntryNotFound {
		t.Fatalf("expected ErrTimeEntryNotFound for unauthorized batch, got: %v", err)
	}

	// VAL-SEC-TRACK-004 core assertion: NO partial mutation on ANY targeted entry.
	memberReadback1, err := trackingService.GetTimeEntry(ctx, workspaceID, memberID, memberEntry1.ID)
	if err != nil {
		t.Fatalf("user B direct readback of entry 1 after denied batch: %v", err)
	}
	if memberReadback1.Description != originalMemberEntry1Desc {
		t.Fatalf("VAL-SEC-TRACK-004: user B's entry 1 was partially mutated; expected %q, got %q", originalMemberEntry1Desc, memberReadback1.Description)
	}

	memberReadback2, err := trackingService.GetTimeEntry(ctx, workspaceID, memberID, memberEntry2.ID)
	if err != nil {
		t.Fatalf("user B direct readback of entry 2 after denied batch: %v", err)
	}
	if memberReadback2.Description != originalMemberEntry2Desc {
		t.Fatalf("VAL-SEC-TRACK-004: user B's entry 2 was partially mutated; expected %q, got %q", originalMemberEntry2Desc, memberReadback2.Description)
	}

	// Verify entry counts are unchanged
	memberEntries, err := trackingService.ListTimeEntries(ctx, workspaceID, trackingapplication.ListTimeEntriesFilter{
		UserID: memberID,
	})
	if err != nil {
		t.Fatalf("list user B entries after denied batch: %v", err)
	}
	if len(memberEntries) != 2 {
		t.Fatalf("VAL-SEC-TRACK-004: user B should still have exactly 2 entries, got %d", len(memberEntries))
	}
}
