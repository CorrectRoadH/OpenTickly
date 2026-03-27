package application_test

import (
	"context"
	"testing"
	"time"

	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"
	tenantpostgres "opentoggl/backend/apps/backend/internal/tenant/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"
)

// seedAdditionalWorkspace creates a new organization and workspace without
// creating a new user. This lets us test multi-workspace scenarios for one user.
func seedAdditionalWorkspace(t *testing.T, ctx context.Context, database *pgtest.Database, prefix string) int64 {
	t.Helper()

	tenantStore := tenantpostgres.NewStore(database.Pool)
	_, workspace, err := tenantStore.CreateOrganization(
		ctx,
		prefix+" Org",
		prefix+" Workspace",
		tenantdomain.DefaultWorkspaceSettings(),
	)
	if err != nil {
		t.Fatalf("create additional workspace: %v", err)
	}
	return int64(workspace.ID())
}

// TestListUserTimeEntriesFiltersByWorkspace verifies that ListUserTimeEntries
// only returns time entries belonging to the requested workspace when a
// WorkspaceID filter is provided. Entries in other workspaces must not leak.
func TestListUserTimeEntriesFiltersByWorkspace(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceA, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "ws-scope-a")
	workspaceB := seedAdditionalWorkspace(t, ctx, database, "ws-scope-b")

	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	// Create entries in workspace A
	startA := time.Date(2026, 3, 25, 10, 0, 0, 0, time.UTC)
	stopA := time.Date(2026, 3, 25, 11, 0, 0, 0, time.UTC)
	entryA, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceA,
		UserID:      userID,
		Description: "Entry in workspace A",
		Start:       startA,
		Stop:        &stopA,
		CreatedWith: "ws-scope-test",
	})
	if err != nil {
		t.Fatalf("create entry in workspace A: %v", err)
	}

	// Create entries in workspace B
	startB := time.Date(2026, 3, 25, 12, 0, 0, 0, time.UTC)
	stopB := time.Date(2026, 3, 25, 13, 0, 0, 0, time.UTC)
	entryB, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceB,
		UserID:      userID,
		Description: "Entry in workspace B",
		Start:       startB,
		Stop:        &stopB,
		CreatedWith: "ws-scope-test",
	})
	if err != nil {
		t.Fatalf("create entry in workspace B: %v", err)
	}

	// List entries for workspace A only
	entriesA, err := trackingService.ListUserTimeEntries(ctx, trackingapplication.ListTimeEntriesFilter{
		UserID:      userID,
		WorkspaceID: workspaceA,
	})
	if err != nil {
		t.Fatalf("list entries for workspace A: %v", err)
	}
	if len(entriesA) != 1 {
		t.Fatalf("expected 1 entry for workspace A, got %d", len(entriesA))
	}
	if entriesA[0].ID != entryA.ID {
		t.Fatalf("expected entry %d for workspace A, got %d", entryA.ID, entriesA[0].ID)
	}

	// List entries for workspace B only
	entriesB, err := trackingService.ListUserTimeEntries(ctx, trackingapplication.ListTimeEntriesFilter{
		UserID:      userID,
		WorkspaceID: workspaceB,
	})
	if err != nil {
		t.Fatalf("list entries for workspace B: %v", err)
	}
	if len(entriesB) != 1 {
		t.Fatalf("expected 1 entry for workspace B, got %d", len(entriesB))
	}
	if entriesB[0].ID != entryB.ID {
		t.Fatalf("expected entry %d for workspace B, got %d", entryB.ID, entriesB[0].ID)
	}
}

// TestListUserTimeEntriesWithoutWorkspaceReturnsAll verifies that when no
// WorkspaceID filter is provided, ListUserTimeEntries still returns entries
// across all workspaces (backwards compatibility for /me/time_entries).
func TestListUserTimeEntriesWithoutWorkspaceReturnsAll(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceA, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "ws-all-a")
	workspaceB := seedAdditionalWorkspace(t, ctx, database, "ws-all-b")

	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	startA := time.Date(2026, 3, 25, 10, 0, 0, 0, time.UTC)
	stopA := time.Date(2026, 3, 25, 11, 0, 0, 0, time.UTC)
	if _, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceA,
		UserID:      userID,
		Description: "Entry A",
		Start:       startA,
		Stop:        &stopA,
		CreatedWith: "ws-all-test",
	}); err != nil {
		t.Fatalf("create entry A: %v", err)
	}

	startB := time.Date(2026, 3, 25, 12, 0, 0, 0, time.UTC)
	stopB := time.Date(2026, 3, 25, 13, 0, 0, 0, time.UTC)
	if _, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceB,
		UserID:      userID,
		Description: "Entry B",
		Start:       startB,
		Stop:        &stopB,
		CreatedWith: "ws-all-test",
	}); err != nil {
		t.Fatalf("create entry B: %v", err)
	}

	// No workspace filter — should return both
	entries, err := trackingService.ListUserTimeEntries(ctx, trackingapplication.ListTimeEntriesFilter{
		UserID: userID,
	})
	if err != nil {
		t.Fatalf("list all entries: %v", err)
	}
	if len(entries) != 2 {
		t.Fatalf("expected 2 entries across all workspaces, got %d", len(entries))
	}
}

// TestCurrentTimeEntryIsGlobalAcrossWorkspaces verifies that GetCurrentTimeEntry
// returns the running timer regardless of which workspace it belongs to.
// This is the documented global per-user running timer semantic.
func TestCurrentTimeEntryIsGlobalAcrossWorkspaces(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	_, userID := seedTrackingWorkspaceWithUniqueEmail(t, ctx, database, "ws-current-a")
	workspaceB := seedAdditionalWorkspace(t, ctx, database, "ws-current-b")

	catalogService := mustNewTrackingCatalogService(t, database)
	trackingService := mustNewTrackingService(t, database, catalogService, testLogger)

	// Start a running timer in workspace B
	start := time.Date(2026, 3, 25, 14, 0, 0, 0, time.UTC)
	running, err := trackingService.CreateTimeEntry(ctx, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceB,
		UserID:      userID,
		Description: "Running in workspace B",
		Start:       start,
		CreatedWith: "ws-current-test",
	})
	if err != nil {
		t.Fatalf("create running entry in workspace B: %v", err)
	}

	// GetCurrentTimeEntry must return it (global, not workspace-scoped)
	current, err := trackingService.GetCurrentTimeEntry(ctx, userID)
	if err != nil {
		t.Fatalf("get current time entry: %v", err)
	}
	if current.ID != running.ID {
		t.Fatalf("expected current entry ID %d, got %d", running.ID, current.ID)
	}
	if current.WorkspaceID != workspaceB {
		t.Fatalf("expected current entry workspace %d, got %d", workspaceB, current.WorkspaceID)
	}
}
