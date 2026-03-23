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
	loadedClient, err := service.GetClient(ctx, workspaceID, client.ID)
	if err != nil {
		t.Fatalf("get client: %v", err)
	}
	if loadedClient.ID != client.ID || loadedClient.Name != client.Name {
		t.Fatalf("expected loaded client to match created client, got %#v", loadedClient)
	}
	renamedClient, err := service.UpdateClient(ctx, catalogapplication.UpdateClientCommand{
		WorkspaceID: workspaceID,
		ClientID:    client.ID,
		Name:        stringPtr(" North Ridge Enterprise "),
	})
	if err != nil {
		t.Fatalf("update client: %v", err)
	}
	if renamedClient.Name != "North Ridge Enterprise" {
		t.Fatalf("expected renamed client, got %#v", renamedClient)
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
	loadedTag, err := service.GetTag(ctx, workspaceID, tag.ID)
	if err != nil {
		t.Fatalf("get tag: %v", err)
	}
	if loadedTag.ID != tag.ID || loadedTag.Name != tag.Name {
		t.Fatalf("expected loaded tag to match created tag, got %#v", loadedTag)
	}
	renamedTag, err := service.UpdateTag(ctx, catalogapplication.UpdateTagCommand{
		WorkspaceID: workspaceID,
		TagID:       tag.ID,
		Name:        stringPtr(" Internal "),
	})
	if err != nil {
		t.Fatalf("update tag: %v", err)
	}
	if renamedTag.Name != "Internal" {
		t.Fatalf("expected renamed tag, got %#v", renamedTag)
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
	loadedProject, err := service.GetProject(ctx, workspaceID, project.ID)
	if err != nil {
		t.Fatalf("get project: %v", err)
	}
	if loadedProject.ID != project.ID || loadedProject.Name != project.Name {
		t.Fatalf("expected loaded project to match created project, got %#v", loadedProject)
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

	tags, err := service.ListTags(ctx, workspaceID, catalogapplication.ListTagsFilter{Search: "int", Page: 1, PerPage: 50})
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

	createdTask, err := service.CreateTask(ctx, catalogapplication.CreateTaskCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		ProjectID:   &project.ID,
		Name:        "Delivery",
	})
	if err != nil {
		t.Fatalf("create task: %v", err)
	}
	if createdTask.Name != "Delivery" || !createdTask.Active {
		t.Fatalf("expected created task to persist normalized name and default active state, got %#v", createdTask)
	}
	loadedTask, err := service.GetTask(ctx, workspaceID, project.ID, createdTask.ID)
	if err != nil {
		t.Fatalf("get task: %v", err)
	}
	if loadedTask.ID != createdTask.ID || loadedTask.Name != createdTask.Name || loadedTask.ProjectID == nil || *loadedTask.ProjectID != project.ID {
		t.Fatalf("expected loaded task to match created task, got %#v", loadedTask)
	}
	updatedTask, err := service.UpdateTask(ctx, catalogapplication.UpdateTaskCommand{
		WorkspaceID: workspaceID,
		ProjectID:   project.ID,
		TaskID:      createdTask.ID,
		Name:        stringPtr(" Delivery Final "),
		Active:      boolPtr(false),
	})
	if err != nil {
		t.Fatalf("update task: %v", err)
	}
	if updatedTask.Name != "Delivery Final" || updatedTask.Active {
		t.Fatalf("expected updated task to persist rename/inactive state, got %#v", updatedTask)
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
	if inactiveTasks.TotalCount != 2 || len(inactiveTasks.Tasks) != 2 || inactiveTasks.Tasks[0].Name != "Delivery Final" || inactiveTasks.Tasks[1].Name != "Review" {
		t.Fatalf("expected inactive task page, got %#v", inactiveTasks)
	}

	if err := service.DeleteTask(ctx, workspaceID, project.ID, createdTask.ID); err != nil {
		t.Fatalf("delete task: %v", err)
	}
	if _, err := service.GetTask(ctx, workspaceID, project.ID, createdTask.ID); !errors.Is(err, catalogapplication.ErrTaskNotFound) {
		t.Fatalf("expected ErrTaskNotFound after delete, got %v", err)
	}

	if err := service.DeleteTag(ctx, workspaceID, tag.ID); err != nil {
		t.Fatalf("delete tag: %v", err)
	}
	if _, err := service.GetTag(ctx, workspaceID, tag.ID); !errors.Is(err, catalogapplication.ErrTagNotFound) {
		t.Fatalf("expected ErrTagNotFound after delete, got %v", err)
	}
}

func TestServiceReturnsProjectNotFoundForMissingProjectMutations(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedCatalogWorkspaceAndUser(t, ctx, database)
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

	if _, err := service.CreateTask(ctx, catalogapplication.CreateTaskCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		ProjectID:   int64Ptr(999),
		Name:        "Missing project task",
	}); !errors.Is(err, catalogapplication.ErrProjectNotFound) {
		t.Fatalf("expected ErrProjectNotFound from create task, got %v", err)
	}

	if _, err := service.GetClient(ctx, workspaceID, 999); !errors.Is(err, catalogapplication.ErrClientNotFound) {
		t.Fatalf("expected ErrClientNotFound from get client, got %v", err)
	}

	if _, err := service.UpdateClient(ctx, catalogapplication.UpdateClientCommand{
		WorkspaceID: workspaceID,
		ClientID:    999,
		Name:        stringPtr("Missing"),
	}); !errors.Is(err, catalogapplication.ErrClientNotFound) {
		t.Fatalf("expected ErrClientNotFound from update client, got %v", err)
	}

	if _, err := service.GetTag(ctx, workspaceID, 999); !errors.Is(err, catalogapplication.ErrTagNotFound) {
		t.Fatalf("expected ErrTagNotFound from get tag, got %v", err)
	}

	if _, err := service.UpdateTag(ctx, catalogapplication.UpdateTagCommand{
		WorkspaceID: workspaceID,
		TagID:       999,
		Name:        stringPtr("Missing"),
	}); !errors.Is(err, catalogapplication.ErrTagNotFound) {
		t.Fatalf("expected ErrTagNotFound from update tag, got %v", err)
	}

	if err := service.DeleteTag(ctx, workspaceID, 999); !errors.Is(err, catalogapplication.ErrTagNotFound) {
		t.Fatalf("expected ErrTagNotFound from delete tag, got %v", err)
	}

	if _, err := service.GetTask(ctx, workspaceID, 999, 999); !errors.Is(err, catalogapplication.ErrProjectNotFound) {
		t.Fatalf("expected ErrProjectNotFound from get task with missing project, got %v", err)
	}

	project, err := service.CreateProject(ctx, catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "Existing Project",
	})
	if err != nil {
		t.Fatalf("create project for missing task checks: %v", err)
	}

	if _, err := service.GetTask(ctx, workspaceID, project.ID, 999); !errors.Is(err, catalogapplication.ErrTaskNotFound) {
		t.Fatalf("expected ErrTaskNotFound from get task, got %v", err)
	}

	if _, err := service.UpdateTask(ctx, catalogapplication.UpdateTaskCommand{
		WorkspaceID: workspaceID,
		ProjectID:   project.ID,
		TaskID:      999,
		Name:        stringPtr("Missing"),
	}); !errors.Is(err, catalogapplication.ErrTaskNotFound) {
		t.Fatalf("expected ErrTaskNotFound from update task, got %v", err)
	}

	if err := service.DeleteTask(ctx, workspaceID, project.ID, 999); !errors.Is(err, catalogapplication.ErrTaskNotFound) {
		t.Fatalf("expected ErrTaskNotFound from delete task, got %v", err)
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

func int64Ptr(value int64) *int64 {
	return &value
}

func boolPtr(value bool) *bool {
	return &value
}
