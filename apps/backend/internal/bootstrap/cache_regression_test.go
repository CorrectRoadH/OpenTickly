package bootstrap

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"slices"
	"time"

	catalog "opentoggl/backend/apps/backend/internal/catalog/application"
	importing "opentoggl/backend/apps/backend/internal/importing/application"
	"opentoggl/backend/apps/backend/internal/log"
	tenant "opentoggl/backend/apps/backend/internal/tenant/domain"
	tenantpostgres "opentoggl/backend/apps/backend/internal/tenant/infra/postgres"
	tracking "opentoggl/backend/apps/backend/internal/tracking/application"
	"testing"

	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestArchivedClientDetailReflectsArchive(t *testing.T) {
	database := pgtest.Open(t)
	app, err := NewApp(Config{
		ServiceName: "opentoggl-api",
		Server: ServerConfig{
			ListenAddress: ":0",
		},
		Database: DatabaseConfig{
			PrimaryDSN: database.ConnString(),
		},
		Redis: RedisConfig{
			Address: "redis://127.0.0.1:6379/0",
		},
	})
	if err != nil {
		t.Fatalf("NewApp returned error: %v", err)
	}
	t.Cleanup(app.Platform.Database.Close)
	t.Cleanup(func() { _ = app.Platform.Cache.FlushDB(context.Background()) })

	email := uniqueTestEmail("cached-client")
	password := "secret1"
	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", struct {
		Email    string `json:"email"`
		Fullname string `json:"fullname"`
		Password string `json:"password"`
	}{
		Email:    email,
		Fullname: "Cached Token",
		Password: password,
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}
	var registerBody struct {
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &registerBody)
	if registerBody.CurrentWorkspaceID == nil {
		t.Fatalf("expected current workspace id, got %#v", registerBody)
	}
	workspaceID := *registerBody.CurrentWorkspaceID

	authorization := basicAuthorization(email, password)
	createClient := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/clients",
		struct {
			Name string `json:"name"`
		}{Name: "Cached Client"},
		authorization,
	)
	if createClient.Code != http.StatusOK {
		t.Fatalf("expected client create status 200, got %d body=%s", createClient.Code, createClient.Body.String())
	}
	var clientBody struct {
		ID int64 `json:"id"`
	}
	mustDecodeJSON(t, createClient.Body.Bytes(), &clientBody)
	if clientBody.ID == 0 {
		t.Fatalf("expected client id, got %#v", clientBody)
	}

	warmClient := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/clients/"+intToString(clientBody.ID),
		nil,
		authorization,
	)
	if warmClient.Code != http.StatusOK {
		t.Fatalf("expected warm client detail status 200, got %d body=%s", warmClient.Code, warmClient.Body.String())
	}
	var activeClient struct {
		Archived bool `json:"archived"`
	}
	mustDecodeJSON(t, warmClient.Body.Bytes(), &activeClient)
	if activeClient.Archived {
		t.Fatalf("expected pre-archive client detail to show archived=false, got body=%s", warmClient.Body.String())
	}

	archiveClient := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/clients/"+intToString(clientBody.ID)+"/archive",
		nil,
		authorization,
	)
	if archiveClient.Code != http.StatusOK {
		t.Fatalf("expected client archive status 200, got %d body=%s", archiveClient.Code, archiveClient.Body.String())
	}

	getClient := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/clients/"+intToString(clientBody.ID),
		nil,
		authorization,
	)
	if getClient.Code != http.StatusOK {
		t.Fatalf("expected client detail status 200, got %d body=%s", getClient.Code, getClient.Body.String())
	}
	var archivedClient struct {
		Archived bool `json:"archived"`
	}
	mustDecodeJSON(t, getClient.Body.Bytes(), &archivedClient)
	if !archivedClient.Archived {
		t.Fatalf(
			"expected archived client detail to show archived=true, got body=%s",
			getClient.Body.String(),
		)
	}
}

func TestCrossModuleWritesAreVisibleToCurrentReads(t *testing.T) {
	app := newAuditSecurityApp(t)
	user := registerAuditUser(t, app)
	ctx := context.Background()
	pool := app.Platform.Database.Pool()
	services := newPlatformServices(app.Config)
	t.Cleanup(services.Database.Close)
	t.Cleanup(func() { _ = services.Cache.Close() })
	routes, err := newRouteHandlers(pool, services, log.NewZapLogger(slog.Default()), nil)
	if err != nil {
		t.Fatal(err)
	}

	client, err := routes.catalogApp.CreateClient(ctx, catalog.CreateClientCommand{
		WorkspaceID: user.WorkspaceID, CreatedBy: user.ID, Name: "Before import client",
	})
	if err != nil {
		t.Fatal(err)
	}
	tag, err := routes.catalogApp.CreateTag(ctx, catalog.CreateTagCommand{
		WorkspaceID: user.WorkspaceID, CreatedBy: user.ID, Name: "Before import tag",
	})
	if err != nil {
		t.Fatal(err)
	}
	timer, err := routes.trackingApp.CreateTimeEntry(ctx, tracking.CreateTimeEntryCommand{
		WorkspaceID: user.WorkspaceID, UserID: user.ID, Start: time.Now().Add(-time.Minute),
		CreatedWith: "cache-regression", TagIDs: []int64{tag.ID},
	})
	if err != nil {
		t.Fatal(err)
	}

	gotClient, err := routes.catalogApp.GetClient(ctx, user.WorkspaceID, client.ID)
	if err != nil || gotClient.Name != client.Name {
		t.Fatalf("client before import: %+v, %v", gotClient, err)
	}
	var cachedClient catalog.ClientView
	clientKey := fmt.Sprintf("catalog:display:client:%d:%d", user.WorkspaceID, client.ID)
	if hit, err := services.Cache.Get(ctx, clientKey, &cachedClient); !hit || err != nil || cachedClient.Name != client.Name {
		t.Errorf("client display was not cached: %+v, hit=%v, err=%v", cachedClient, hit, err)
	}
	cachedClient.Name = "From Redis"
	if err := services.Cache.Set(ctx, clientKey, cachedClient, time.Minute); err != nil {
		t.Fatal(err)
	}
	clientPath := fmt.Sprintf("/api/v9/workspaces/%d/clients/%d", user.WorkspaceID, client.ID)
	response := performAuthorizedJSONRequest(t, app, http.MethodGet, clientPath, nil, user.Authorization)
	if response.Code != http.StatusOK {
		t.Fatalf("client detail read: %d %s", response.Code, response.Body)
	}
	var displayedClient struct {
		Name string `json:"name"`
	}
	mustDecodeJSON(t, response.Body.Bytes(), &displayedClient)
	if displayedClient.Name != cachedClient.Name {
		t.Errorf("repeated client display = %q; want Redis value %q", displayedClient.Name, cachedClient.Name)
	}
	gotTag, err := routes.catalogApp.GetTag(ctx, user.WorkspaceID, tag.ID)
	if err != nil || gotTag.Name != tag.Name {
		t.Fatalf("tag before import: %+v, %v", gotTag, err)
	}
	gotTimer, err := routes.trackingApp.GetCurrentTimeEntry(ctx, user.ID)
	if err != nil || gotTimer.ID != timer.ID || !slices.Equal(gotTimer.TagNames, []string{tag.Name}) {
		t.Fatalf("timer before import: %+v, %v", gotTimer, err)
	}
	if _, err := routes.billingApp.CommercialStatusForWorkspace(ctx, user.WorkspaceID); err != nil {
		t.Fatalf("billing before deletion: %v", err)
	}

	const importedClientName = "After import client"
	const importedTagName = "After import tag"
	archive := mustBuildImportZipArchive(t, map[string]string{
		"clients.json":  fmt.Sprintf(`[{"id":%d,"name":%q}]`, client.ID, importedClientName),
		"projects.json": "[]",
		"tags.json":     fmt.Sprintf(`[{"id":%d,"name":%q}]`, tag.ID, importedTagName),
	})
	job, err := routes.importingApp.StartWorkspaceImport(ctx, user.WorkspaceID, user.ID, importing.ImportSourceTogglExportArchive, archive)
	if err != nil || job.Status != importing.ImportStatusCompleted {
		t.Fatalf("archive import did not complete: %+v, %v", job, err)
	}

	gotClient, err = routes.catalogApp.GetClient(ctx, user.WorkspaceID, client.ID)
	if err != nil || gotClient.Name != importedClientName {
		t.Errorf("client after import = %q, %v; want %q", gotClient.Name, err, importedClientName)
	}
	gotTag, err = routes.catalogApp.GetTag(ctx, user.WorkspaceID, tag.ID)
	if err != nil || gotTag.Name != importedTagName {
		t.Errorf("tag after import = %q, %v; want %q", gotTag.Name, err, importedTagName)
	}
	gotTimer, err = routes.trackingApp.GetCurrentTimeEntry(ctx, user.ID)
	if err != nil || gotTimer.ID != timer.ID || !slices.Equal(gotTimer.TagNames, []string{importedTagName}) {
		t.Errorf("timer after import = %d %v, %v; want %d [%s]", gotTimer.ID, gotTimer.TagNames, err, timer.ID, importedTagName)
	}

	archive = mustBuildImportZipArchive(t, map[string]string{
		"clients.json":  fmt.Sprintf(`[{"id":%d,"name":%q,"archived":true}]`, client.ID+100000, importedClientName),
		"projects.json": "[]",
		"tags.json":     "[]",
	})
	job, err = routes.importingApp.StartWorkspaceImport(ctx, user.WorkspaceID, user.ID, importing.ImportSourceTogglExportArchive, archive)
	if err != nil || job.Status != importing.ImportStatusCompleted {
		t.Fatalf("name-matched import did not complete: %+v, %v", job, err)
	}
	gotClient, err = routes.catalogApp.GetClient(ctx, user.WorkspaceID, client.ID)
	if err != nil || !gotClient.Archived {
		t.Errorf("import matched by name did not invalidate target client %d: %+v, %v", client.ID, gotClient, err)
	}

	if err := tenantpostgres.NewStore(pool).DeleteWorkspace(ctx, tenant.WorkspaceID(user.WorkspaceID)); err != nil {
		t.Fatal(err)
	}
	response = performAuthorizedJSONRequest(t, app, http.MethodGet, clientPath, nil, user.Authorization)
	if response.Code != http.StatusForbidden {
		t.Errorf("cached client in deleted workspace: %d %s", response.Code, response.Body)
	}
	if _, err := routes.billingApp.CommercialStatusForWorkspace(ctx, user.WorkspaceID); err == nil {
		t.Error("billing resolved a deleted workspace")
	}
	gotTimer, err = routes.trackingApp.GetCurrentTimeEntry(ctx, user.ID)
	if err != nil || gotTimer.ID != 0 {
		t.Errorf("timer after workspace deletion = %d, %v; want no timer", gotTimer.ID, err)
	}
}
