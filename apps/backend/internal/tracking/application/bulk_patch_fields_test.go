package application_test

import (
	"context"
	"slices"
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

	success, failures, err := trackingService.PatchTimeEntries(ctx, trackingapplication.PatchTimeEntriesCommand{
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
	if len(failures) != 0 {
		t.Fatalf("expected no failures, got %+v", failures)
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

	if _, _, err := trackingService.PatchTimeEntries(ctx, trackingapplication.PatchTimeEntriesCommand{
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

// TestPatchTimeEntries_AddAndRemoveTagsAreIncremental pins Toggl's semantics for
// the `add` and `remove` ops on /tags: unlike `replace`, they must leave the
// tags an entry already carries alone.
func TestPatchTimeEntries_AddAndRemoveTagsAreIncremental(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "bulk-patch-tag-ops")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	keep, err := catalogService.CreateTag(ctx, catalogapplication.CreateTagCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "KeepTag",
	})
	if err != nil {
		t.Fatalf("create keep tag: %v", err)
	}
	added, err := catalogService.CreateTag(ctx, catalogapplication.CreateTagCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "AddedTag",
	})
	if err != nil {
		t.Fatalf("create added tag: %v", err)
	}

	start := time.Date(2026, 4, 3, 9, 0, 0, 0, time.UTC)
	stop := start.Add(time.Hour)
	entry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: "tag ops",
		Start:       start,
		Stop:        &stop,
		TagIDs:      []int64{keep.ID},
		CreatedWith: "bulk-patch-tag-ops-test",
	})
	if err != nil {
		t.Fatalf("create entry: %v", err)
	}

	if _, _, err := trackingService.PatchTimeEntries(ctx, trackingapplication.PatchTimeEntriesCommand{
		WorkspaceID:  workspaceID,
		UserID:       userID,
		TimeEntryIDs: []int64{entry.ID},
		AddTagIDs:    []int64{added.ID},
	}); err != nil {
		t.Fatalf("add tag patch: %v", err)
	}

	readback, err := trackingService.GetTimeEntry(ctx, workspaceID, userID, entry.ID)
	if err != nil {
		t.Fatalf("readback after add: %v", err)
	}
	if !slices.Contains(readback.TagIDs, keep.ID) {
		t.Fatalf("add op dropped the pre-existing tag: %v", readback.TagIDs)
	}
	if !slices.Contains(readback.TagIDs, added.ID) {
		t.Fatalf("add op did not add the requested tag: %v", readback.TagIDs)
	}

	if _, _, err := trackingService.PatchTimeEntries(ctx, trackingapplication.PatchTimeEntriesCommand{
		WorkspaceID:  workspaceID,
		UserID:       userID,
		TimeEntryIDs: []int64{entry.ID},
		RemoveTagIDs: []int64{added.ID},
	}); err != nil {
		t.Fatalf("remove tag patch: %v", err)
	}

	readback, err = trackingService.GetTimeEntry(ctx, workspaceID, userID, entry.ID)
	if err != nil {
		t.Fatalf("readback after remove: %v", err)
	}
	if slices.Contains(readback.TagIDs, added.ID) {
		t.Fatalf("remove op left the tag in place: %v", readback.TagIDs)
	}
	if !slices.Contains(readback.TagIDs, keep.ID) {
		t.Fatalf("remove op dropped an unrelated tag: %v", readback.TagIDs)
	}
}

// TestPatchTimeEntries_ReportsMissingEntriesAsFailures pins the non-transactional
// contract: a bad id lands in the failure list while the good ids still apply,
// instead of aborting the batch or being reported as a success.
func TestPatchTimeEntries_ReportsMissingEntriesAsFailures(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "bulk-patch-failures")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	start := time.Date(2026, 4, 4, 9, 0, 0, 0, time.UTC)
	stop := start.Add(time.Hour)
	entry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: "before",
		Start:       start,
		Stop:        &stop,
		CreatedWith: "bulk-patch-failures-test",
	})
	if err != nil {
		t.Fatalf("create entry: %v", err)
	}

	const missingID int64 = 999_999_999
	success, failures, err := trackingService.PatchTimeEntries(ctx, trackingapplication.PatchTimeEntriesCommand{
		WorkspaceID:  workspaceID,
		UserID:       userID,
		TimeEntryIDs: []int64{missingID, entry.ID},
		Description:  lo.ToPtr("after"),
	})
	if err != nil {
		t.Fatalf("patch time entries: %v", err)
	}
	if !slices.Equal(success, []int64{entry.ID}) {
		t.Fatalf("expected only the real entry to succeed, got %v", success)
	}
	if len(failures) != 1 || failures[0].ID != missingID {
		t.Fatalf("expected the missing id in the failure list, got %+v", failures)
	}

	readback, err := trackingService.GetTimeEntry(ctx, workspaceID, userID, entry.ID)
	if err != nil {
		t.Fatalf("readback: %v", err)
	}
	if readback.Description != "after" {
		t.Fatalf("expected the valid entry to still be patched, got %q", readback.Description)
	}
}
