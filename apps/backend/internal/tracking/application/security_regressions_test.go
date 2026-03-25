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
