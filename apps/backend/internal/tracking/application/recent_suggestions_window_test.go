package application_test

import (
	"context"
	"testing"
	"time"

	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"
)

// TestRecentSuggestionsRespect90DayWindow guards the #5 optimization: the
// recent-suggestions query bounds its window function to the last 90 days, so a
// long-dormant reusable entry must not surface while a recent one does.
func TestRecentSuggestionsRespect90DayWindow(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "recent-window")
	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	const oldDescription = "Dormant task older than the window"
	const recentDescription = "Task within the window"

	oldStart := time.Now().UTC().Add(-120 * 24 * time.Hour)
	oldStop := oldStart.Add(30 * time.Minute)
	if _, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: oldDescription,
		Start:       oldStart,
		Stop:        &oldStop,
		CreatedWith: "recent-window-test",
	}); err != nil {
		t.Fatalf("create old entry: %v", err)
	}

	recentStart := time.Now().UTC().Add(-2 * 24 * time.Hour)
	recentStop := recentStart.Add(30 * time.Minute)
	if _, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Description: recentDescription,
		Start:       recentStart,
		Stop:        &recentStop,
		CreatedWith: "recent-window-test",
	}); err != nil {
		t.Fatalf("create recent entry: %v", err)
	}

	suggestions, err := trackingService.ListRecentTimeEntrySuggestions(ctx, workspaceID, userID, 8)
	if err != nil {
		t.Fatalf("list recent suggestions: %v", err)
	}

	var sawRecent, sawOld bool
	for _, s := range suggestions {
		switch s.Description {
		case recentDescription:
			sawRecent = true
		case oldDescription:
			sawOld = true
		}
	}
	if !sawRecent {
		t.Fatalf("expected recent entry within the 90-day window to be suggested, got %+v", suggestions)
	}
	if sawOld {
		t.Fatalf("entry older than 90 days must be excluded from suggestions, got %+v", suggestions)
	}
}
