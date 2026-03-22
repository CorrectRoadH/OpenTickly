package application_test

import (
	"context"
	"errors"
	"testing"

	identitydomain "opentoggl/backend/apps/backend/internal/identity/domain"
	identitypostgres "opentoggl/backend/apps/backend/internal/identity/infra/postgres"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"
	tenantpostgres "opentoggl/backend/apps/backend/internal/tenant/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	catalogpostgres "opentoggl/backend/apps/backend/internal/catalog/infra/postgres"
)

func TestServicePersistsCatalogStateWithPostgresStore(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedCatalogWorkspaceAndUser(t, ctx, database)
	service := mustNewCatalogService(t, database)

	client, err := service.CreateClient(ctx, catalogapplication.CreateClientCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "  North Ridge Client  ",
	})
	if err != nil {
		t.Fatalf("create client: %v", err)
	}
	if client.Name != "North Ridge Client" {
		t.Fatalf("expected normalized client name, got %q", client.Name)
	}

	group, err := service.CreateGroup(ctx, catalogapplication.CreateGroupCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "Core Team",
	})
	if err != nil {
		t.Fatalf("create group: %v", err)
	}
	if group.Name != "Core Team" {
		t.Fatalf("expected group name to persist, got %q", group.Name)
	}

	tag, err := service.CreateTag(ctx, catalogapplication.CreateTagCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "Billable",
	})
	if err != nil {
		t.Fatalf("create tag: %v", err)
	}
	if tag.Name != "Billable" {
		t.Fatalf("expected tag name to persist, got %q", tag.Name)
	}

	project, err := service.CreateProject(ctx, catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		ClientID:    &client.ID,
		Name:        "Website Revamp",
		Template:    boolPtr(true),
		Recurring:   boolPtr(true),
	})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}
	if !project.Active {
		t.Fatal("expected create project to default active=true")
	}

	updatedProject, err := service.UpdateProject(ctx, catalogapplication.UpdateProjectCommand{
		WorkspaceID: workspaceID,
		ProjectID:   project.ID,
		Name:        stringPtr("Website Launch"),
		Active:      boolPtr(false),
	})
	if err != nil {
		t.Fatalf("update project: %v", err)
	}
	if updatedProject.Name != "Website Launch" || updatedProject.Active {
		t.Fatalf("expected updated project name/inactive state, got %#v", updatedProject)
	}

	pinnedProject, err := service.SetProjectPinned(ctx, catalogapplication.SetProjectPinnedCommand{
		WorkspaceID: workspaceID,
		ProjectID:   project.ID,
		Pinned:      true,
	})
	if err != nil {
		t.Fatalf("pin project: %v", err)
	}
	if !pinnedProject.Pinned {
		t.Fatal("expected pinned project to persist")
	}

	if _, err := database.Pool.Exec(ctx, `
		insert into catalog_project_users (project_id, user_id, role)
		values ($1, $2, 'admin')
	`, project.ID, userID); err != nil {
		t.Fatalf("insert project user: %v", err)
	}
	if _, err := database.Pool.Exec(ctx, `
		insert into catalog_tasks (workspace_id, project_id, name, active, created_by)
		values ($1, $2, 'Design', true, $3),
		       ($1, $2, 'Review', false, $3)
	`, workspaceID, project.ID, userID); err != nil {
		t.Fatalf("insert tasks: %v", err)
	}
	if _, err := database.Pool.Exec(ctx, `
		update catalog_clients
		set archived = true
		where id = $1
	`, client.ID); err != nil {
		t.Fatalf("archive client: %v", err)
	}

	clients, err := service.ListClients(ctx, workspaceID, catalogapplication.ListClientsFilter{
		Name:   "ridge",
		Status: catalogapplication.ClientStatusArchived,
	})
	if err != nil {
		t.Fatalf("list clients: %v", err)
	}
	if len(clients) != 1 || clients[0].ID != client.ID || !clients[0].Archived {
		t.Fatalf("expected archived client filter to return archived client, got %#v", clients)
	}

	groups, err := service.ListGroups(ctx, workspaceID)
	if err != nil {
		t.Fatalf("list groups: %v", err)
	}
	if len(groups) != 1 || groups[0].ID != group.ID {
		t.Fatalf("expected one group, got %#v", groups)
	}

	tags, err := service.ListTags(ctx, workspaceID, catalogapplication.ListTagsFilter{Search: "bill", Page: 1, PerPage: 50})
	if err != nil {
		t.Fatalf("list tags: %v", err)
	}
	if len(tags) != 1 || tags[0].ID != tag.ID {
		t.Fatalf("expected one tag, got %#v", tags)
	}

	projectUsers, err := service.ListProjectUsers(ctx, workspaceID, catalogapplication.ListProjectUsersFilter{ProjectIDs: []int64{project.ID}})
	if err != nil {
		t.Fatalf("list project users: %v", err)
	}
	if len(projectUsers) != 1 || projectUsers[0].UserID != userID || projectUsers[0].Role != "admin" {
		t.Fatalf("expected one admin project user, got %#v", projectUsers)
	}

	projects, err := service.ListProjects(ctx, workspaceID, catalogapplication.ListProjectsFilter{
		Active:    boolPtr(false),
		Page:      1,
		PerPage:   20,
		SortField: catalogapplication.ProjectSortFieldCreatedAt,
		SortOrder: catalogapplication.SortOrderDescending,
	})
	if err != nil {
		t.Fatalf("list projects: %v", err)
	}
	if len(projects) != 1 || projects[0].ID != project.ID || projects[0].Name != "Website Launch" || !projects[0].Pinned {
		t.Fatalf("expected updated pinned project, got %#v", projects)
	}

	activeTasks, err := service.ListTasks(ctx, workspaceID, catalogapplication.ListTasksFilter{Page: 1, PerPage: 50})
	if err != nil {
		t.Fatalf("list active tasks: %v", err)
	}
	if activeTasks.TotalCount != 1 || len(activeTasks.Tasks) != 1 || activeTasks.Tasks[0].Name != "Design" {
		t.Fatalf("expected default active task page, got %#v", activeTasks)
	}

	inactiveTasks, err := service.ListTasks(ctx, workspaceID, catalogapplication.ListTasksFilter{
		Active:    boolPtr(false),
		Page:      1,
		PerPage:   50,
		SortField: catalogapplication.TaskSortFieldCreatedAt,
		SortOrder: catalogapplication.SortOrderDescending,
	})
	if err != nil {
		t.Fatalf("list inactive tasks: %v", err)
	}
	if inactiveTasks.TotalCount != 1 || len(inactiveTasks.Tasks) != 1 || inactiveTasks.Tasks[0].Name != "Review" {
		t.Fatalf("expected inactive task page, got %#v", inactiveTasks)
	}
}

func TestServiceReturnsProjectNotFoundForMissingProjectMutations(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, _ := seedCatalogWorkspaceAndUser(t, ctx, database)
	service := mustNewCatalogService(t, database)

	if _, err := service.UpdateProject(ctx, catalogapplication.UpdateProjectCommand{
		WorkspaceID: workspaceID,
		ProjectID:   999,
		Name:        stringPtr("Missing"),
	}); !errors.Is(err, catalogapplication.ErrProjectNotFound) {
		t.Fatalf("expected ErrProjectNotFound from update, got %v", err)
	}

	if _, err := service.SetProjectPinned(ctx, catalogapplication.SetProjectPinnedCommand{
		WorkspaceID: workspaceID,
		ProjectID:   999,
		Pinned:      true,
	}); !errors.Is(err, catalogapplication.ErrProjectNotFound) {
		t.Fatalf("expected ErrProjectNotFound from pin, got %v", err)
	}
}

func mustNewCatalogService(t *testing.T, database *pgtest.Database) *catalogapplication.Service {
	t.Helper()

	service, err := catalogapplication.NewService(catalogpostgres.NewStore(database.Pool))
	if err != nil {
		t.Fatalf("new catalog service: %v", err)
	}
	return service
}

func seedCatalogWorkspaceAndUser(t *testing.T, ctx context.Context, database *pgtest.Database) (workspaceID int64, userID int64) {
	t.Helper()

	tenantStore := tenantpostgres.NewStore(database.Pool)
	_, workspace, err := tenantStore.CreateOrganization(
		ctx,
		"Catalog Org",
		"Catalog Workspace",
		tenantdomain.DefaultWorkspaceSettings(),
	)
	if err != nil {
		t.Fatalf("create catalog tenant state: %v", err)
	}

	userID = 101
	user, err := identitydomain.RegisterUser(identitydomain.RegisterParams{
		ID:       userID,
		Email:    "catalog@example.com",
		FullName: "Catalog User",
		Password: "secret1",
		APIToken: "catalog-api-token",
	})
	if err != nil {
		t.Fatalf("register catalog user: %v", err)
	}
	if err := identitypostgres.NewUserRepository(database.Pool).Save(ctx, user); err != nil {
		t.Fatalf("save catalog user: %v", err)
	}

	return int64(workspace.ID()), userID
}

func stringPtr(value string) *string {
	return &value
}

func boolPtr(value bool) *bool {
	return &value
}
