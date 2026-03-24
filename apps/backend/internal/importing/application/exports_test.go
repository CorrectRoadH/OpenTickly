package application_test

import (
	"bytes"
	"context"
	"fmt"
	"testing"
	"time"

	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	identitypostgres "opentoggl/backend/apps/backend/internal/identity/infra/postgres"
	importingapplication "opentoggl/backend/apps/backend/internal/importing/application"
	importingpostgres "opentoggl/backend/apps/backend/internal/importing/infra/postgres"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
	trackingpostgres "opentoggl/backend/apps/backend/internal/tracking/infra/postgres"
)

func TestServicePersistsUserAndWorkspaceExports(t *testing.T) {
	database := pgtest.Open(t)
	service, err := importingapplication.NewService(importingpostgres.NewStore(database.Pool))
	if err != nil {
		t.Fatalf("new service: %v", err)
	}

	ctx := context.Background()
	identityService := identityapplication.NewService(identityapplication.Config{
		Users:              identitypostgres.NewUserRepository(database.Pool),
		Sessions:           identitypostgres.NewSessionRepository(database.Pool),
		PushServices:       identitypostgres.NewPushServiceRepository(database.Pool),
		JobRecorder:        identitypostgres.NewJobRecorder(database.Pool),
		RunningTimerLookup: trackingpostgres.NewRunningTimerLookup(database.Pool),
		IDs:                identitypostgres.NewSequence(database.Pool),
	})

	// Generate unique email and workspace ID to avoid collisions when tests run in parallel
	uniqueEmail := fmt.Sprintf("export-user-%d@example.com", time.Now().UnixNano())
	workspaceID := time.Now().UnixNano() // Full nanosecond precision for unique workspace ID
	auth, err := identityService.Register(ctx, identityapplication.RegisterInput{
		Email:    uniqueEmail,
		FullName: "Test Person",
		Password: "secret1",
	})
	if err != nil {
		t.Fatalf("register identity user: %v", err)
	}

	userToken, err := service.StartUserExport(ctx, auth.User.ID, importingapplication.UserExportSelection{
		Profile: true,
	})
	if err != nil {
		t.Fatalf("start user export: %v", err)
	}

	workspaceToken, err := service.StartWorkspaceExport(ctx, workspaceID, auth.User.ID, []string{"timeline", "projects"})
	if err != nil {
		t.Fatalf("start workspace export: %v", err)
	}

	userExports, err := service.ListUserExports(ctx, auth.User.ID)
	if err != nil {
		t.Fatalf("list user exports: %v", err)
	}
	if len(userExports) != 1 || userExports[0].Token != userToken || userExports[0].State != importingapplication.ExportStateCompleted {
		t.Fatalf("expected one completed user export, got %#v", userExports)
	}

	workspaceExports, err := service.ListWorkspaceExports(ctx, workspaceID)
	if err != nil {
		t.Fatalf("list workspace exports: %v", err)
	}
	if len(workspaceExports) != 1 || workspaceExports[0].Token != workspaceToken || workspaceExports[0].State != importingapplication.ExportStateCompleted {
		t.Fatalf("expected one completed workspace export, got %#v", workspaceExports)
	}

	userArchive, err := service.GetUserExportArchive(ctx, auth.User.ID, userToken)
	if err != nil {
		t.Fatalf("get user export archive: %v", err)
	}
	if userArchive.Filename != userToken+".zip" {
		t.Fatalf("expected user archive filename %q, got %#v", userToken+".zip", userArchive)
	}
	if len(userArchive.Content) == 0 {
		t.Fatalf("expected user archive content, got %#v", userArchive)
	}

	workspaceArchive, err := service.GetWorkspaceExportArchive(ctx, workspaceID, workspaceToken)
	if err != nil {
		t.Fatalf("get workspace export archive: %v", err)
	}
	if workspaceArchive.Filename != workspaceToken+".zip" {
		t.Fatalf("expected workspace archive filename %q, got %#v", workspaceToken+".zip", workspaceArchive)
	}
	if bytes.Equal(userArchive.Content, workspaceArchive.Content) {
		t.Fatalf("expected distinct archive payloads per export scope")
	}
}
