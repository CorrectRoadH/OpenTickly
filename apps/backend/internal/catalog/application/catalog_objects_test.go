package application_test

import (
	"context"
	"errors"
	"log/slog"
	"testing"
	"time"

	identitydomain "opentoggl/backend/apps/backend/internal/identity/domain"
	identitypostgres "opentoggl/backend/apps/backend/internal/identity/infra/postgres"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"
	tenantpostgres "opentoggl/backend/apps/backend/internal/tenant/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	catalogpostgres "opentoggl/backend/apps/backend/internal/catalog/infra/postgres"
	"opentoggl/backend/apps/backend/internal/log"

	"github.com/samber/lo"
)

var testLogger = log.NewZapLogger(slog.Default())

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
		Name:        lo.ToPtr(" North Ridge Enterprise "),
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
		Name:        lo.ToPtr(" Internal "),
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
		Template:    lo.ToPtr(true),
		Recurring:   lo.ToPtr(true),
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
		Name:        lo.ToPtr("Website Launch"),
		Active:      lo.ToPtr(false),
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
		Active:    lo.ToPtr(false),
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
		Name:        lo.ToPtr(" Delivery Final "),
		Active:      lo.ToPtr(false),
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
		Active:    lo.ToPtr(false),
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

func TestServiceSupportsAdditionalCatalogMutations(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedCatalogWorkspaceAndUser(t, ctx, database)
	service := mustNewCatalogService(t, database)

	clientA, err := service.CreateClient(ctx, catalogapplication.CreateClientCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "Client A",
	})
	if err != nil {
		t.Fatalf("create client A: %v", err)
	}
	clientB, err := service.CreateClient(ctx, catalogapplication.CreateClientCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "Client B",
	})
	if err != nil {
		t.Fatalf("create client B: %v", err)
	}

	clientsByID, err := service.ListClientsByIDs(ctx, workspaceID, []int64{clientA.ID, clientB.ID})
	if err != nil {
		t.Fatalf("list clients by ids: %v", err)
	}
	if len(clientsByID) != 2 {
		t.Fatalf("expected two clients by ids, got %#v", clientsByID)
	}

	project, err := service.CreateProject(ctx, catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		ClientID:    &clientA.ID,
		Name:        "Project A",
	})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}
	if _, err := database.Pool.Exec(ctx, `
		insert into catalog_project_users (project_id, user_id, role)
		values ($1, $2, 'admin')
	`, project.ID, userID); err != nil {
		t.Fatalf("insert project user: %v", err)
	}
	if _, err := database.Pool.Exec(ctx, `
		insert into catalog_tasks (workspace_id, project_id, name, active, created_by)
		values ($1, $2, 'Task A', true, $3)
	`, workspaceID, project.ID, userID); err != nil {
		t.Fatalf("insert project task: %v", err)
	}
	if _, err := database.Pool.Exec(ctx, `
		update catalog_projects
		set active = false
		where workspace_id = $1 and id = $2
	`, workspaceID, project.ID); err != nil {
		t.Fatalf("pre-archive project: %v", err)
	}

	archivedProjectIDs, err := service.ArchiveClient(ctx, workspaceID, clientA.ID)
	if err != nil {
		t.Fatalf("archive client: %v", err)
	}
	if len(archivedProjectIDs) != 1 || archivedProjectIDs[0] != project.ID {
		t.Fatalf("expected archived project id %d, got %#v", project.ID, archivedProjectIDs)
	}

	archivedClient, err := service.GetClient(ctx, workspaceID, clientA.ID)
	if err != nil {
		t.Fatalf("get archived client: %v", err)
	}
	if !archivedClient.Archived {
		t.Fatalf("expected archived client state, got %#v", archivedClient)
	}
	archivedProject, err := service.GetProject(ctx, workspaceID, project.ID)
	if err != nil {
		t.Fatalf("get archived project: %v", err)
	}
	if archivedProject.Active {
		t.Fatalf("expected archived project to be inactive, got %#v", archivedProject)
	}

	restoredClient, err := service.RestoreClient(ctx, catalogapplication.RestoreClientCommand{
		WorkspaceID: workspaceID,
		ClientID:    clientA.ID,
		ProjectIDs:  []int64{project.ID},
	})
	if err != nil {
		t.Fatalf("restore client: %v", err)
	}
	if restoredClient.Archived {
		t.Fatalf("expected restored client archived=false, got %#v", restoredClient)
	}
	restoredProject, err := service.GetProject(ctx, workspaceID, project.ID)
	if err != nil {
		t.Fatalf("get restored project: %v", err)
	}
	if !restoredProject.Active {
		t.Fatalf("expected restored project active=true, got %#v", restoredProject)
	}

	group, err := service.CreateGroup(ctx, catalogapplication.CreateGroupCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "Team A",
	})
	if err != nil {
		t.Fatalf("create group: %v", err)
	}
	updatedGroup, err := service.UpdateGroup(ctx, workspaceID, group.ID, "Team Alpha")
	if err != nil {
		t.Fatalf("update group: %v", err)
	}
	if updatedGroup.Name != "Team Alpha" {
		t.Fatalf("expected updated group name, got %#v", updatedGroup)
	}
	if err := service.DeleteGroup(ctx, workspaceID, group.ID); err != nil {
		t.Fatalf("delete group: %v", err)
	}
	if _, err := service.GetGroup(ctx, workspaceID, group.ID); !errors.Is(err, catalogapplication.ErrGroupNotFound) {
		t.Fatalf("expected ErrGroupNotFound after group delete, got %v", err)
	}

	taskCounts, err := service.CountProjectTasks(ctx, workspaceID, []int64{project.ID})
	if err != nil {
		t.Fatalf("count project tasks: %v", err)
	}
	if len(taskCounts) != 1 || taskCounts[0].Count != 1 {
		t.Fatalf("expected one task count, got %#v", taskCounts)
	}

	userCounts, err := service.CountProjectUsers(ctx, workspaceID, []int64{project.ID})
	if err != nil {
		t.Fatalf("count project users: %v", err)
	}
	if len(userCounts) != 1 || userCounts[0].Count != 1 {
		t.Fatalf("expected one user count, got %#v", userCounts)
	}

	secondUserID := seedCatalogIdentityUser(t, ctx, database, 202, "teammate@example.com", "Teammate User")

	createdProjectUser, err := service.CreateProjectUser(ctx, catalogapplication.CreateProjectUserCommand{
		WorkspaceID: workspaceID,
		ProjectID:   project.ID,
		UserID:      secondUserID,
		Manager:     true,
	})
	if err != nil {
		t.Fatalf("create project user: %v", err)
	}
	if createdProjectUser.Role != "admin" {
		t.Fatalf("expected manager project user role admin, got %#v", createdProjectUser)
	}

	updatedProjectUser, err := service.UpdateProjectUser(ctx, catalogapplication.UpdateProjectUserCommand{
		WorkspaceID: workspaceID,
		ProjectID:   project.ID,
		UserID:      secondUserID,
		Manager:     false,
	})
	if err != nil {
		t.Fatalf("update project user: %v", err)
	}
	if updatedProjectUser.Role != "member" {
		t.Fatalf("expected non-manager project user role member, got %#v", updatedProjectUser)
	}

	projectUsersAfterMutation, err := service.ListProjectUsers(ctx, workspaceID, catalogapplication.ListProjectUsersFilter{
		ProjectIDs: []int64{project.ID},
	})
	if err != nil {
		t.Fatalf("list project users after mutation: %v", err)
	}
	if len(projectUsersAfterMutation) != 2 {
		t.Fatalf("expected two project users after mutation, got %#v", projectUsersAfterMutation)
	}

	if err := service.DeleteProjectUser(ctx, workspaceID, project.ID, secondUserID); err != nil {
		t.Fatalf("delete project user: %v", err)
	}

	projectUsersAfterDelete, err := service.ListProjectUsers(ctx, workspaceID, catalogapplication.ListProjectUsersFilter{
		ProjectIDs: []int64{project.ID},
	})
	if err != nil {
		t.Fatalf("list project users after delete: %v", err)
	}
	if len(projectUsersAfterDelete) != 1 {
		t.Fatalf("expected one project user after delete, got %#v", projectUsersAfterDelete)
	}

	if err := service.DeleteProject(ctx, workspaceID, project.ID); err != nil {
		t.Fatalf("delete project: %v", err)
	}
	if _, err := service.GetProject(ctx, workspaceID, project.ID); !errors.Is(err, catalogapplication.ErrProjectNotFound) {
		t.Fatalf("expected ErrProjectNotFound after project delete, got %v", err)
	}

	if err := service.DeleteClients(ctx, workspaceID, []int64{clientB.ID}); err != nil {
		t.Fatalf("delete clients: %v", err)
	}
	if _, err := service.GetClient(ctx, workspaceID, clientB.ID); !errors.Is(err, catalogapplication.ErrClientNotFound) {
		t.Fatalf("expected ErrClientNotFound after client delete, got %v", err)
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
		Name:        lo.ToPtr("Missing"),
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
		ProjectID:   lo.ToPtr(int64(999)),
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
		Name:        lo.ToPtr("Missing"),
	}); !errors.Is(err, catalogapplication.ErrClientNotFound) {
		t.Fatalf("expected ErrClientNotFound from update client, got %v", err)
	}

	if _, err := service.GetTag(ctx, workspaceID, 999); !errors.Is(err, catalogapplication.ErrTagNotFound) {
		t.Fatalf("expected ErrTagNotFound from get tag, got %v", err)
	}

	if _, err := service.UpdateTag(ctx, catalogapplication.UpdateTagCommand{
		WorkspaceID: workspaceID,
		TagID:       999,
		Name:        lo.ToPtr("Missing"),
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
		Name:        lo.ToPtr("Missing"),
	}); !errors.Is(err, catalogapplication.ErrTaskNotFound) {
		t.Fatalf("expected ErrTaskNotFound from update task, got %v", err)
	}

	if err := service.DeleteTask(ctx, workspaceID, project.ID, 999); !errors.Is(err, catalogapplication.ErrTaskNotFound) {
		t.Fatalf("expected ErrTaskNotFound from delete task, got %v", err)
	}
}

func TestServicePersistsProjectGroupAssignments(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedCatalogWorkspaceAndUser(t, ctx, database)
	service := mustNewCatalogService(t, database)

	project, err := service.CreateProject(ctx, catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "Project Groups",
	})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}
	group, err := service.CreateGroup(ctx, catalogapplication.CreateGroupCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "Delivery Team",
	})
	if err != nil {
		t.Fatalf("create group: %v", err)
	}

	projectGroup, err := service.CreateProjectGroup(ctx, catalogapplication.CreateProjectGroupCommand{
		WorkspaceID: workspaceID,
		ProjectID:   project.ID,
		GroupID:     group.ID,
	})
	if err != nil {
		t.Fatalf("create project group: %v", err)
	}
	if projectGroup.WorkspaceID != workspaceID || projectGroup.ProjectID != project.ID || projectGroup.GroupID != group.ID {
		t.Fatalf("expected persisted project group assignment, got %#v", projectGroup)
	}

	projectGroups, err := service.ListProjectGroups(ctx, workspaceID, []int64{project.ID})
	if err != nil {
		t.Fatalf("list project groups: %v", err)
	}
	if len(projectGroups) != 1 || projectGroups[0].ID != projectGroup.ID {
		t.Fatalf("expected one project group assignment, got %#v", projectGroups)
	}

	if err := service.DeleteProjectGroup(ctx, workspaceID, projectGroup.ID); err != nil {
		t.Fatalf("delete project group: %v", err)
	}

	projectGroups, err = service.ListProjectGroups(ctx, workspaceID, []int64{project.ID})
	if err != nil {
		t.Fatalf("list project groups after delete: %v", err)
	}
	if len(projectGroups) != 0 {
		t.Fatalf("expected no project groups after delete, got %#v", projectGroups)
	}
}

func TestServiceReturnsRecurringProjectPeriodWithinBoundary(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedCatalogWorkspaceAndUser(t, ctx, database)
	service := mustNewCatalogService(t, database)

	project, err := service.CreateProject(ctx, catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "Recurring Delivery",
		Recurring:   lo.ToPtr(true),
	})
	if err != nil {
		t.Fatalf("create recurring project: %v", err)
	}

	periodStart := time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC)
	periodEnd := time.Date(2026, 3, 31, 0, 0, 0, 0, time.UTC)
	if _, err := database.Pool.Exec(
		ctx,
		`update catalog_projects
		set recurring_period_start = $2, recurring_period_end = $3
		where workspace_id = $1 and id = $4`,
		workspaceID,
		periodStart,
		periodEnd,
		project.ID,
	); err != nil {
		t.Fatalf("seed recurring period: %v", err)
	}

	period, err := service.GetProjectRecurringPeriod(
		ctx,
		workspaceID,
		project.ID,
		lo.ToPtr(time.Date(2026, 3, 10, 0, 0, 0, 0, time.UTC)),
		lo.ToPtr(time.Date(2026, 3, 20, 0, 0, 0, 0, time.UTC)),
	)
	if err != nil {
		t.Fatalf("get recurring period: %v", err)
	}
	if period == nil || !period.StartDate.Equal(periodStart) || !period.EndDate.Equal(periodEnd) {
		t.Fatalf("expected recurring period %s..%s, got %#v", periodStart, periodEnd, period)
	}

	period, err = service.GetProjectRecurringPeriod(
		ctx,
		workspaceID,
		project.ID,
		lo.ToPtr(time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC)),
		lo.ToPtr(time.Date(2026, 4, 30, 0, 0, 0, 0, time.UTC)),
	)
	if err != nil {
		t.Fatalf("get recurring period outside boundary: %v", err)
	}
	if period != nil {
		t.Fatalf("expected no recurring period outside boundary, got %#v", period)
	}
}

func mustNewCatalogService(t *testing.T, database *pgtest.Database) *catalogapplication.Service {
	t.Helper()

	service, err := catalogapplication.NewService(catalogpostgres.NewStore(database.Pool), testLogger)
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
	seedCatalogIdentityUser(t, ctx, database, userID, "catalog@example.com", "Catalog User")

	return int64(workspace.ID()), userID
}

func seedCatalogIdentityUser(
	t *testing.T,
	ctx context.Context,
	database *pgtest.Database,
	userID int64,
	email string,
	fullName string,
) int64 {
	t.Helper()

	user, err := identitydomain.RegisterUser(identitydomain.RegisterParams{
		ID:       userID,
		Email:    email,
		FullName: fullName,
		Password: "secret1",
		APIToken: email + "-token",
	})
	if err != nil {
		t.Fatalf("register catalog user: %v", err)
	}
	if err := identitypostgres.NewUserRepository(database.Pool).Save(ctx, user); err != nil {
		t.Fatalf("save catalog user: %v", err)
	}
	return user.ID()
}
