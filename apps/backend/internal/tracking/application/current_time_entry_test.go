package application_test

import (
	"context"
	"testing"
	"time"

	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestGetCurrentTimeEntry_ReturnsEmptyViewWhenNoRunningEntry(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	_, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "no-running")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	entry, err := trackingService.GetCurrentTimeEntry(ctx, userID)
	if err != nil {
		t.Fatalf("expected no error when no running entry, got %v", err)
	}
	if entry.ID != 0 {
		t.Fatalf("expected empty entry with ID 0, got ID %d", entry.ID)
	}
}

// TestGetCurrentTimeEntry_FallbackForNegativeDuration verifies that a running
// entry (duration_seconds < 0) is found even when tracking_running_timers has
// no row for the user. This happens when entries are imported or created
// through paths that skip the running-timer bookkeeping.
func TestGetCurrentTimeEntry_FallbackForNegativeDuration(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "fallback-neg-dur")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	// Insert a time entry with negative duration directly, bypassing the
	// service so that tracking_running_timers is NOT populated.
	now := time.Now().UTC()
	var entryID int64
	err := database.Pool.QueryRow(ctx, `
		insert into tracking_time_entries (
			workspace_id, user_id, description, billable,
			start_time, stop_time, duration_seconds,
			created_with, tag_ids, expense_ids
		) values (
			$1, $2, 'imported running', false,
			$3, null, -1,
			'test', '{}', '{}'
		) returning id`,
		workspaceID, userID, now,
	).Scan(&entryID)
	if err != nil {
		t.Fatalf("insert test entry: %v", err)
	}

	entry, err := trackingService.GetCurrentTimeEntry(ctx, userID)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if entry.ID != entryID {
		t.Fatalf("expected entry ID %d, got %d", entryID, entry.ID)
	}
	if entry.Description != "imported running" {
		t.Fatalf("expected description 'imported running', got %q", entry.Description)
	}

	// Second call should use the repaired tracking_running_timers row.
	entry2, err := trackingService.GetCurrentTimeEntry(ctx, userID)
	if err != nil {
		t.Fatalf("second call: expected no error, got %v", err)
	}
	if entry2.ID != entryID {
		t.Fatalf("second call: expected entry ID %d, got %d", entryID, entry2.ID)
	}
}
