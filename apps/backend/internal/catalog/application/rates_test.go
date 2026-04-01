package application_test

import (
	"context"
	"testing"
	"time"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	"opentoggl/backend/apps/backend/internal/log"
	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"
	membershippostgres "opentoggl/backend/apps/backend/internal/membership/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestServicePersistsRatesAcrossSupportedLevels(t *testing.T) {
	database := pgtest.Open(t)
	ctx := context.Background()

	workspaceID, userID := seedCatalogWorkspaceAndUser(t, ctx, database)
	service := mustNewCatalogService(t, database)
	membershipService := mustNewMembershipService(t, database)

	if _, err := membershipService.EnsureWorkspaceOwner(ctx, membershipapplication.EnsureWorkspaceOwnerCommand{
		WorkspaceID: workspaceID,
		UserID:      userID,
	}); err != nil {
		t.Fatalf("ensure workspace owner: %v", err)
	}

	secondUserID := seedCatalogIdentityUser(t, ctx, database, 303, "rates@example.com", "Rates User")
	secondMember, err := membershipService.EnsureWorkspaceOwner(ctx, membershipapplication.EnsureWorkspaceOwnerCommand{
		WorkspaceID: workspaceID,
		UserID:      secondUserID,
	})
	if err != nil {
		t.Fatalf("ensure second workspace member: %v", err)
	}

	project, err := service.CreateProject(ctx, catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		Name:        "Rate Project",
	})
	if err != nil {
		t.Fatalf("create project: %v", err)
	}

	projectUser, err := service.CreateProjectUser(ctx, catalogapplication.CreateProjectUserCommand{
		WorkspaceID: workspaceID,
		ProjectID:   project.ID,
		UserID:      secondUserID,
		Manager:     false,
	})
	if err != nil {
		t.Fatalf("create project user: %v", err)
	}
	projectUserID := catalogapplication.EncodeProjectUserID(projectUser.ProjectID, projectUser.UserID)

	task, err := service.CreateTask(ctx, catalogapplication.CreateTaskCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   userID,
		ProjectID:   &project.ID,
		Name:        "Rate Task",
	})
	if err != nil {
		t.Fatalf("create task: %v", err)
	}

	workspaceStart := time.Date(2026, 3, 1, 10, 0, 0, 0, time.UTC)
	workspaceRate, err := service.CreateRate(ctx, catalogapplication.CreateRateCommand{
		WorkspaceID: workspaceID,
		CreatorID:   userID,
		Level:       catalogapplication.RateLevelWorkspace,
		LevelID:     workspaceID,
		Type:        catalogapplication.RateTypeBillable,
		Amount:      125.5,
		Start:       &workspaceStart,
	})
	if err != nil {
		t.Fatalf("create workspace rate: %v", err)
	}
	if workspaceRate.Level != catalogapplication.RateLevelWorkspace || workspaceRate.Amount != 125.5 {
		t.Fatalf("expected persisted workspace rate, got %#v", workspaceRate)
	}

	workspaceUserStart := time.Date(2026, 3, 2, 9, 0, 0, 0, time.UTC)
	workspaceUserRate, err := service.CreateRate(ctx, catalogapplication.CreateRateCommand{
		WorkspaceID: workspaceID,
		CreatorID:   userID,
		Level:       catalogapplication.RateLevelWorkspaceUser,
		LevelID:     secondMember.ID,
		Type:        catalogapplication.RateTypeLaborCost,
		Amount:      55,
		Start:       &workspaceUserStart,
	})
	if err != nil {
		t.Fatalf("create workspace user rate: %v", err)
	}
	if workspaceUserRate.WorkspaceUserID == nil || *workspaceUserRate.WorkspaceUserID != secondMember.ID {
		t.Fatalf("expected workspace user rate target to persist, got %#v", workspaceUserRate)
	}

	projectStart := time.Date(2026, 3, 3, 9, 0, 0, 0, time.UTC)
	projectRate, err := service.CreateRate(ctx, catalogapplication.CreateRateCommand{
		WorkspaceID: workspaceID,
		CreatorID:   userID,
		Level:       catalogapplication.RateLevelProject,
		LevelID:     project.ID,
		Type:        catalogapplication.RateTypeBillable,
		Amount:      150,
		Start:       &projectStart,
	})
	if err != nil {
		t.Fatalf("create project rate: %v", err)
	}
	if projectRate.ProjectID == nil || *projectRate.ProjectID != project.ID {
		t.Fatalf("expected project rate target to persist, got %#v", projectRate)
	}

	projectUserStart := time.Date(2026, 3, 4, 9, 0, 0, 0, time.UTC)
	projectUserRate, err := service.CreateRate(ctx, catalogapplication.CreateRateCommand{
		WorkspaceID: workspaceID,
		CreatorID:   userID,
		Level:       catalogapplication.RateLevelProjectUser,
		LevelID:     projectUserID,
		Type:        catalogapplication.RateTypeBillable,
		Amount:      175,
		Start:       &projectUserStart,
	})
	if err != nil {
		t.Fatalf("create project user rate: %v", err)
	}
	if projectUserRate.ProjectUserID == nil || *projectUserRate.ProjectUserID != projectUserID {
		t.Fatalf("expected project user rate target to persist, got %#v", projectUserRate)
	}

	taskStart := time.Date(2026, 3, 5, 9, 0, 0, 0, time.UTC)
	taskRate, err := service.CreateRate(ctx, catalogapplication.CreateRateCommand{
		WorkspaceID: workspaceID,
		CreatorID:   userID,
		Level:       catalogapplication.RateLevelTask,
		LevelID:     task.ID,
		Type:        catalogapplication.RateTypeLaborCost,
		Amount:      45,
		Start:       &taskStart,
	})
	if err != nil {
		t.Fatalf("create task rate: %v", err)
	}
	if taskRate.PlannedTaskID == nil || *taskRate.PlannedTaskID != task.ID {
		t.Fatalf("expected task rate target to persist, got %#v", taskRate)
	}

	workspaceRates, err := service.GetRatesByLevel(ctx, workspaceID, catalogapplication.RateLevelWorkspace, workspaceID, catalogapplication.RateTypeBillable)
	if err != nil {
		t.Fatalf("list workspace rates: %v", err)
	}
	if len(workspaceRates) != 1 || workspaceRates[0].ID != workspaceRate.ID {
		t.Fatalf("expected one workspace rate, got %#v", workspaceRates)
	}

	workspaceUserRates, err := service.GetRatesByLevel(ctx, workspaceID, catalogapplication.RateLevelWorkspaceUser, secondMember.ID, catalogapplication.RateTypeLaborCost)
	if err != nil {
		t.Fatalf("list workspace user rates: %v", err)
	}
	if len(workspaceUserRates) != 1 || workspaceUserRates[0].ID != workspaceUserRate.ID {
		t.Fatalf("expected one workspace user rate, got %#v", workspaceUserRates)
	}

	projectRates, err := service.GetRatesByLevel(ctx, workspaceID, catalogapplication.RateLevelProject, project.ID, catalogapplication.RateTypeBillable)
	if err != nil {
		t.Fatalf("list project rates: %v", err)
	}
	if len(projectRates) != 1 || projectRates[0].ID != projectRate.ID {
		t.Fatalf("expected one project rate, got %#v", projectRates)
	}

	projectUserRates, err := service.GetRatesByLevel(ctx, workspaceID, catalogapplication.RateLevelProjectUser, projectUserID, catalogapplication.RateTypeBillable)
	if err != nil {
		t.Fatalf("list project user rates: %v", err)
	}
	if len(projectUserRates) != 1 || projectUserRates[0].ID != projectUserRate.ID {
		t.Fatalf("expected one project user rate, got %#v", projectUserRates)
	}

	taskRates, err := service.GetRatesByLevel(ctx, workspaceID, catalogapplication.RateLevelTask, task.ID, catalogapplication.RateTypeLaborCost)
	if err != nil {
		t.Fatalf("list task rates: %v", err)
	}
	if len(taskRates) != 1 || taskRates[0].ID != taskRate.ID {
		t.Fatalf("expected one task rate, got %#v", taskRates)
	}

	var defaultHourlyRate float64
	if err := database.Pool.QueryRow(ctx, `
		select default_hourly_rate
		from tenant_workspaces
		where id = $1
	`, workspaceID).Scan(&defaultHourlyRate); err != nil {
		t.Fatalf("load workspace default hourly rate: %v", err)
	}
	if defaultHourlyRate != 125.5 {
		t.Fatalf("expected workspace default hourly rate to sync, got %v", defaultHourlyRate)
	}

	var laborCost float64
	if err := database.Pool.QueryRow(ctx, `
		select labor_cost
		from membership_workspace_members
		where id = $1
	`, secondMember.ID).Scan(&laborCost); err != nil {
		t.Fatalf("load workspace member labor cost: %v", err)
	}
	if laborCost != 55 {
		t.Fatalf("expected workspace member labor cost to sync, got %v", laborCost)
	}
}

func mustNewMembershipService(t *testing.T, database *pgtest.Database) *membershipapplication.Service {
	t.Helper()

	service, err := membershipapplication.NewService(membershippostgres.NewStore(database.Pool), membershipapplication.WithLogger(log.NopLogger()))
	if err != nil {
		t.Fatalf("new membership service: %v", err)
	}
	return service
}
