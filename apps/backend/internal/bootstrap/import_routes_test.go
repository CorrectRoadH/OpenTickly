package bootstrap

import (
	"archive/zip"
	"bytes"
	"net/http"
	"strconv"
	"testing"

	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestImportRoutesAcceptWorkspaceArchiveUpload(t *testing.T) {
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

	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    "importer@example.com",
		"fullname": "Import User",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}

	var bootstrapResponse struct {
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &bootstrapResponse)
	if bootstrapResponse.CurrentWorkspaceID == nil || *bootstrapResponse.CurrentWorkspaceID <= 0 {
		t.Fatalf("expected current workspace id > 0, got %#v", bootstrapResponse.CurrentWorkspaceID)
	}

	jobCreate := performAuthorizedMultipartRequest(
		t,
		app,
		http.MethodPost,
		"/import/v1/jobs",
		map[string]string{
			"workspace_id": strconv.FormatInt(*bootstrapResponse.CurrentWorkspaceID, 10),
			"source":       "toggl_export_archive",
		},
		"archive",
		"toggl-export.zip",
		mustBuildImportZipArchive(t, map[string]string{
			"toggl_workspace_3550374_export_test/clients.json":  "[]",
			"toggl_workspace_3550374_export_test/projects.json": "[]",
			"toggl_workspace_3550374_export_test/tags.json":     "[]",
		}),
		basicAuthorization("importer@example.com", "secret1"),
	)
	if jobCreate.Code != http.StatusAccepted {
		t.Fatalf("expected import create status 202, got %d body=%s", jobCreate.Code, jobCreate.Body.String())
	}

	var createdJob struct {
		JobID       string `json:"job_id"`
		Status      string `json:"status"`
		WorkspaceID int64  `json:"workspace_id"`
	}
	mustDecodeJSON(t, jobCreate.Body.Bytes(), &createdJob)
	if createdJob.JobID == "" {
		t.Fatalf("expected import job id, got %#v", createdJob)
	}
	if createdJob.Status != "queued" {
		t.Fatalf("expected import job status queued, got %#v", createdJob)
	}
	if createdJob.WorkspaceID != *bootstrapResponse.CurrentWorkspaceID {
		t.Fatalf("expected import workspace id %d, got %#v", *bootstrapResponse.CurrentWorkspaceID, createdJob)
	}

	jobStatus := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/import/v1/jobs/"+createdJob.JobID,
		nil,
		basicAuthorization("importer@example.com", "secret1"),
	)
	if jobStatus.Code != http.StatusOK {
		t.Fatalf("expected import job status 200, got %d body=%s", jobStatus.Code, jobStatus.Body.String())
	}
}

func mustBuildImportZipArchive(t *testing.T, files map[string]string) []byte {
	t.Helper()

	var buffer bytes.Buffer
	writer := zip.NewWriter(&buffer)
	for name, content := range files {
		entry, err := writer.Create(name)
		if err != nil {
			t.Fatalf("create zip entry %s: %v", name, err)
		}
		if _, err := entry.Write([]byte(content)); err != nil {
			t.Fatalf("write zip entry %s: %v", name, err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close zip writer: %v", err)
	}
	return buffer.Bytes()
}
