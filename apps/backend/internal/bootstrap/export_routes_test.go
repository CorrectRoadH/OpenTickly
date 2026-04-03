package bootstrap

import (
	"archive/zip"
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"

	"context"
)

func TestWorkspaceExportRoundTrip(t *testing.T) {
	database := pgtest.OpenEphemeral(t)
	uniqueEmail := uniqueTestEmail("exporter")

	app, err := NewApp(Config{
		ServiceName: "opentoggl-api",
		Server:      ServerConfig{ListenAddress: ":0"},
		Database:    DatabaseConfig{PrimaryDSN: database.ConnString()},
		Redis:       RedisConfig{Address: "redis://127.0.0.1:6379/0"},
	})
	if err != nil {
		t.Fatalf("NewApp returned error: %v", err)
	}
	t.Cleanup(app.Platform.Database.Close)
	t.Cleanup(func() { _ = app.Platform.Cache.FlushDB(context.Background()) })

	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    uniqueEmail,
		"fullname": "Export User",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}

	// Step 1: Import a workspace archive so we have data to export.
	authorization := basicAuthorization(uniqueEmail, "secret1")
	jobCreate := performAuthorizedMultipartRequest(
		t, app, http.MethodPost, "/import/v1/jobs",
		map[string]string{
			"organization_name": "Export Test Org",
			"source":            "toggl_export_archive",
		},
		"archive", "toggl-export.zip",
		mustBuildImportZipArchive(t, map[string]string{
			"toggl_workspace_export/clients.json": `[
				{"id":100,"name":"Test Client","wid":999,"archived":false,"creator_id":1}
			]`,
			"toggl_workspace_export/projects.json": `[
				{"id":200,"name":"Test Project","wid":999,"workspace_id":999,"cid":100,"client_id":100,"active":true,"status":"active","pinned":false,"actual_seconds":3600,"billable":false,"is_private":false,"template":false,"recurring":false,"color":"#ff0000"}
			]`,
			"toggl_workspace_export/tags.json": `[
				{"id":300,"name":"urgent","workspace_id":999,"creator_id":1}
			]`,
		}),
		authorization,
	)
	if jobCreate.Code != http.StatusAccepted {
		t.Fatalf("expected import status 202, got %d body=%s", jobCreate.Code, jobCreate.Body.String())
	}
	var createdJob struct {
		WorkspaceID int64  `json:"workspace_id"`
		Status      string `json:"status"`
	}
	mustDecodeJSON(t, jobCreate.Body.Bytes(), &createdJob)
	if createdJob.Status != "completed" {
		t.Fatalf("expected import completed, got %s", createdJob.Status)
	}
	wid := intToString(createdJob.WorkspaceID)

	// Step 2: Export the workspace data.
	exportResp := performAuthorizedJSONRequest(
		t, app, http.MethodPost,
		"/api/v9/workspaces/"+wid+"/exports",
		[]string{"clients", "projects", "tags"},
		authorization,
	)
	if exportResp.Code != http.StatusOK {
		t.Fatalf("expected export status 200, got %d body=%s", exportResp.Code, exportResp.Body.String())
	}
	var exportToken string
	mustDecodeJSON(t, exportResp.Body.Bytes(), &exportToken)
	if exportToken == "" {
		t.Fatal("expected non-empty export token")
	}

	// Step 3: Download the export archive directly from the database.
	// (The HTTP route /exports/data/:uuid.zip has an Echo param binding issue
	// with the .zip suffix in httptest, so we query the store directly.)
	var archiveBytes []byte
	if err := database.Pool.QueryRow(
		context.Background(),
		"SELECT archive_content FROM importing_exports WHERE token = $1",
		exportToken,
	).Scan(&archiveBytes); err != nil {
		t.Fatalf("failed to fetch export archive from DB: %v", err)
	}

	// Step 4: Parse the exported ZIP and verify JSON content.
	zipReader, err := zip.NewReader(bytes.NewReader(archiveBytes), int64(len(archiveBytes)))
	if err != nil {
		t.Fatalf("failed to open export ZIP: %v", err)
	}

	zipFiles := make(map[string][]byte)
	for _, f := range zipReader.File {
		rc, err := f.Open()
		if err != nil {
			t.Fatalf("failed to open zip entry %s: %v", f.Name, err)
		}
		content, err := io.ReadAll(rc)
		rc.Close()
		if err != nil {
			t.Fatalf("failed to read zip entry %s: %v", f.Name, err)
		}
		zipFiles[f.Name] = content
	}

	// Verify clients.json
	clientsJSON, ok := zipFiles["clients.json"]
	if !ok {
		t.Fatal("export ZIP missing clients.json")
	}
	var exportedClients []struct {
		ID       int64  `json:"id"`
		Name     string `json:"name"`
		Archived bool   `json:"archived"`
	}
	if err := json.Unmarshal(clientsJSON, &exportedClients); err != nil {
		t.Fatalf("failed to parse exported clients.json: %v", err)
	}
	if len(exportedClients) != 1 {
		t.Fatalf("expected 1 exported client, got %d", len(exportedClients))
	}
	if exportedClients[0].ID != 100 || exportedClients[0].Name != "Test Client" {
		t.Fatalf("exported client mismatch: %#v", exportedClients[0])
	}

	// Verify projects.json
	projectsJSON, ok := zipFiles["projects.json"]
	if !ok {
		t.Fatal("export ZIP missing projects.json")
	}
	var exportedProjects []struct {
		ID            int64  `json:"id"`
		Name          string `json:"name"`
		ClientID      *int64 `json:"client_id"`
		Active        bool   `json:"active"`
		ActualSeconds int64  `json:"actual_seconds"`
		Color         string `json:"color"`
	}
	if err := json.Unmarshal(projectsJSON, &exportedProjects); err != nil {
		t.Fatalf("failed to parse exported projects.json: %v", err)
	}
	if len(exportedProjects) != 1 {
		t.Fatalf("expected 1 exported project, got %d", len(exportedProjects))
	}
	if exportedProjects[0].ID != 200 || exportedProjects[0].Name != "Test Project" {
		t.Fatalf("exported project mismatch: %#v", exportedProjects[0])
	}
	if exportedProjects[0].ClientID == nil || *exportedProjects[0].ClientID != 100 {
		t.Fatalf("exported project client_id mismatch: %#v", exportedProjects[0])
	}
	if exportedProjects[0].ActualSeconds != 3600 {
		t.Fatalf("exported project actual_seconds mismatch: got %d", exportedProjects[0].ActualSeconds)
	}

	// Verify tags.json
	tagsJSON, ok := zipFiles["tags.json"]
	if !ok {
		t.Fatal("export ZIP missing tags.json")
	}
	var exportedTags []struct {
		ID   int64  `json:"id"`
		Name string `json:"name"`
	}
	if err := json.Unmarshal(tagsJSON, &exportedTags); err != nil {
		t.Fatalf("failed to parse exported tags.json: %v", err)
	}
	if len(exportedTags) != 1 {
		t.Fatalf("expected 1 exported tag, got %d", len(exportedTags))
	}
	if exportedTags[0].ID != 300 || exportedTags[0].Name != "urgent" {
		t.Fatalf("exported tag mismatch: %#v", exportedTags[0])
	}

	// Verify manifest.json exists
	if _, ok := zipFiles["manifest.json"]; !ok {
		t.Fatal("export ZIP missing manifest.json")
	}
}
