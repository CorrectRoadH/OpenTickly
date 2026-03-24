package application_test

import (
	"context"
	"testing"
	"time"

	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"
)

func TestUpdateTimeEntry_RecomputesDurationWhenStartChangesWithoutExplicitDuration(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedTrackingWorkspaceAndUser(t, ctx, database)
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	start := time.Date(2026, 3, 23, 10, 0, 0, 0, time.UTC)
	stop := time.Date(2026, 3, 23, 10, 30, 0, 0, time.UTC)
	entry, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: "Update me",
		Start:       start,
		Stop:        &stop,
		CreatedWith: "tracking-update-test",
	})
	if err != nil {
		t.Fatalf("create time entry: %v", err)
	}

	nextStart := time.Date(2026, 3, 23, 9, 28, 0, 0, time.UTC)
	updated, err := trackingService.UpdateTimeEntry(ctx, trackingapplication.UpdateTimeEntryCommand{
		WorkspaceID: workspaceID,
		TimeEntryID: entry.ID,
		UserID:      userID,
		Start:       &nextStart,
		Stop:        &stop,
	})
	if err != nil {
		t.Fatalf("update time entry: %v", err)
	}

	if !updated.Start.Equal(nextStart) {
		t.Fatalf("expected updated start %s, got %s", nextStart, updated.Start)
	}
	if updated.Stop == nil || !updated.Stop.Equal(stop) {
		t.Fatalf("expected updated stop %s, got %#v", stop, updated.Stop)
	}
	expectedDuration := int(stop.Sub(nextStart).Seconds())
	if updated.Duration != expectedDuration {
		t.Fatalf("expected updated duration %d, got %d", expectedDuration, updated.Duration)
	}
}
