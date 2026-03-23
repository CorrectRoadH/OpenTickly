package application_test

import (
	"context"
	"testing"

	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestGetCurrentTimeEntry_ReturnsEmptyViewWhenNoRunningEntry(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	_, userID := seedTrackingWorkspaceAndUser(t, ctx, database)
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService)

	entry, err := trackingService.GetCurrentTimeEntry(ctx, userID)
	if err != nil {
		t.Fatalf("expected no error when no running entry, got %v", err)
	}
	if entry.ID != 0 {
		t.Fatalf("expected empty entry with ID 0, got ID %d", entry.ID)
	}
}
