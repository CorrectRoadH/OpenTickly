package application_test

import (
	"context"
	"testing"
	"time"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"

	"github.com/samber/lo"
)

// TestPatchTimeEntries_AppliesProjectAndTagIDs guards the bulk-edit bug where
// PatchTimeEntries silently dropped every path except /description and /billable:
// it returned a success payload for each ID without writing project_id or tags.
// The fix is that the handler now translates JSON-Patch paths into a typed
// PatchTimeEntriesCommand and the service applies every field via UpdateTimeEntry.
func TestPatchTimeEntries_AppliesProjectAndTagIDs(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "bulk-patch-fields")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	project, err := catalogService.CreateProject(ctx, catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "Bulk Patch Project",
	})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}

	tagA, err := catalogService.CreateTag(ctx, catalogapplication.CreateTagCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "BulkPatchTagA",
	})
	if err != nil {
		t.Fatalf("create tag A: %v", err)
	}
	tagB, err := catalogService.CreateTag(ctx, catalogapplication.CreateTagCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "BulkPatchTagB",
	})
	if err != nil {
		t.Fatalf("create tag B: %v", err)
	}

	entryIDs := make([]int64, 0, 2)
	for i := range 2 {
		start := time.Date(2026, 4, 1, 9+i, 0, 0, 0, time.UTC)
		stop := start.Add(30 * time.Minute)
		entry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
			WorkspaceID: workspaceID,
			UserID:      userID,
			Description: "unset",
			Start:       start,
			Stop:        &stop,
			CreatedWith: "bulk-patch-fields-test",
		})
		if err != nil {
			t.Fatalf("create entry %d: %v", i, err)
		}
		entryIDs = append(entryIDs, entry.ID)
	}

	success, err := trackingService.PatchTimeEntries(ctx, trackingapplication.PatchTimeEntriesCommand{
		WorkspaceID:  workspaceID,
		UserID:       userID,
		TimeEntryIDs: entryIDs,
		ProjectID:    &project.ID,
		TagIDs:       []int64{tagA.ID, tagB.ID},
		ReplaceTags:  true,
		Billable:     lo.ToPtr(true),
	})
	if err != nil {
		t.Fatalf("patch time entries: %v", err)
	}
	if len(success) != len(entryIDs) {
		t.Fatalf("expected %d success IDs, got %d", len(entryIDs), len(success))
	}

	for _, id := range entryIDs {
		readback, err := trackingService.GetTimeEntry(ctx, workspaceID, userID, id)
		if err != nil {
			t.Fatalf("readback entry %d: %v", id, err)
		}
		if readback.ProjectID == nil || *readback.ProjectID != project.ID {
			t.Fatalf("entry %d: expected project_id=%d, got %#v", id, project.ID, readback.ProjectID)
		}
		if !readback.Billable {
			t.Fatalf("entry %d: expected billable=true", id)
		}
		if len(readback.TagIDs) != 2 {
			t.Fatalf("entry %d: expected 2 tag IDs, got %d (%v)", id, len(readback.TagIDs), readback.TagIDs)
		}
		for _, expected := range []int64{tagA.ID, tagB.ID} {
			if !lo.Contains(readback.TagIDs, expected) {
				t.Fatalf("entry %d: expected tag %d in %v", id, expected, readback.TagIDs)
			}
		}
	}
}

// TestPatchTimeEntries_ClearsProjectWhenIDZero covers the "explicit null ->
// clear" convention: the handler converts a JSON null on /project_id into
// ProjectID=0, and UpdateTimeEntry interprets that as "detach project".
func TestPatchTimeEntries_ClearsProjectWhenIDZero(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "bulk-patch-clear")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	project, err := catalogService.CreateProject(ctx, catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "Detach Me",
	})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}

	start := time.Date(2026, 4, 2, 10, 0, 0, 0, time.UTC)
	stop := start.Add(time.Hour)
	entry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: "attached",
		Start:       start,
		Stop:        &stop,
		ProjectID:   &project.ID,
		CreatedWith: "bulk-patch-clear-test",
	})
	if err != nil {
		t.Fatalf("create entry: %v", err)
	}

	if _, err := trackingService.PatchTimeEntries(ctx, trackingapplication.PatchTimeEntriesCommand{
		WorkspaceID:  workspaceID,
		UserID:       userID,
		TimeEntryIDs: []int64{entry.ID},
		ProjectID:    lo.ToPtr(int64(0)),
	}); err != nil {
		t.Fatalf("patch time entries: %v", err)
	}

	readback, err := trackingService.GetTimeEntry(ctx, workspaceID, userID, entry.ID)
	if err != nil {
		t.Fatalf("readback: %v", err)
	}
	if readback.ProjectID != nil {
		t.Fatalf("expected project cleared, got %v", *readback.ProjectID)
	}
}
