package application_test

import (
	"context"
	"slices"
	"testing"
	"time"

	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"
)

// TestListUserTimeEntries_ReadsAcrossEveryGivenWorkspace pins the account-wide
// read behind /me/time_entries.
//
// The route used to collapse to the caller's "home" workspace
// (web_user_homes), which is a different column from
// users.default_workspace_id. Clients create entries against the default
// workspace, so once the two drifted apart — creating a workspace in another
// organization is enough — every entry the client wrote became invisible to
// the list it read back, with no error anywhere: the CLI's live suite saw
// "created ok" followed by an empty day list.
func TestListUserTimeEntries_ReadsAcrossEveryGivenWorkspace(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	homeWorkspaceID, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "list-scope-home")
	otherWorkspaceID, _ := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "list-scope-other")

	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	start := time.Date(2026, 4, 5, 9, 0, 0, 0, time.UTC)
	stop := start.Add(time.Hour)
	homeEntry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: homeWorkspaceID,
		UserID:      userID,
		Description: "in home workspace",
		Start:       start,
		Stop:        &stop,
		CreatedWith: "list-scope-test",
	})
	if err != nil {
		t.Fatalf("create entry in home workspace: %v", err)
	}
	otherEntry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: otherWorkspaceID,
		UserID:      userID,
		Description: "in the other workspace",
		Start:       start.Add(2 * time.Hour),
		Stop:        stopAt(start.Add(3 * time.Hour)),
		CreatedWith: "list-scope-test",
	})
	if err != nil {
		t.Fatalf("create entry in other workspace: %v", err)
	}

	entries, err := trackingService.ListUserTimeEntries(ctx, trackingapplication.ListTimeEntriesFilter{
		UserID:       userID,
		WorkspaceIDs: []int64{homeWorkspaceID, otherWorkspaceID},
	})
	if err != nil {
		t.Fatalf("list across workspaces: %v", err)
	}

	ids := make([]int64, 0, len(entries))
	for _, entry := range entries {
		ids = append(ids, entry.ID)
	}
	if !slices.Contains(ids, homeEntry.ID) {
		t.Fatalf("entry %d from the home workspace missing: %v", homeEntry.ID, ids)
	}
	if !slices.Contains(ids, otherEntry.ID) {
		t.Fatalf("entry %d from the other workspace missing: %v", otherEntry.ID, ids)
	}

	// A single-workspace read must still be scoped to that workspace only.
	scoped, err := trackingService.ListUserTimeEntries(ctx, trackingapplication.ListTimeEntriesFilter{
		UserID:      userID,
		WorkspaceID: homeWorkspaceID,
	})
	if err != nil {
		t.Fatalf("list scoped to home workspace: %v", err)
	}
	for _, entry := range scoped {
		if entry.ID == otherEntry.ID {
			t.Fatalf("workspace-scoped read leaked entry %d from another workspace", otherEntry.ID)
		}
	}
}

func stopAt(value time.Time) *time.Time {
	return &value
}
