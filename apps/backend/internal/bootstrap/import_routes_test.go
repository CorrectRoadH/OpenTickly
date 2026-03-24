package bootstrap

import (
	"archive/zip"
	"bytes"
	"context"
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
			"toggl_workspace_3550374_export_test/clients.json": `[
				{"id":57870165,"name":"个人","wid":3550374,"archived":false,"creator_id":4970670}
			]`,
			"toggl_workspace_3550374_export_test/projects.json": `[
				{"id":218647578,"name":"toggl CLI","wid":3550374,"workspace_id":3550374,"cid":57870165,"client_id":57870165,"active":true,"status":"active","pinned":false,"actual_seconds":17893}
			]`,
			"toggl_workspace_3550374_export_test/tags.json": `[
				{"id":7215643,"name":"1 象限","workspace_id":3550374,"creator_id":4970670}
			]`,
			"toggl_workspace_3550374_export_test/workspace_users.json": `[
				{"id":5155401,"uid":4970670,"wid":3550374,"name":"Import User","email":"importer@example.com","active":true,"admin":true,"role":"admin","timezone":"Asia/Shanghai"},
				{"id":5155402,"uid":902,"wid":3550374,"name":"Project User","email":"project-user@example.com","active":true,"admin":false,"role":"member","timezone":"Asia/Shanghai"}
			]`,
			"toggl_workspace_3550374_export_test/projects_users/218647578.json": `[
				{"id":76387654,"project_id":218647578,"user_id":4970670,"workspace_id":3550374,"manager":true,"rate":null},
				{"id":76387655,"project_id":218647578,"user_id":902,"workspace_id":3550374,"manager":false,"rate":null}
			]`,
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
	if createdJob.Status != "completed" {
		t.Fatalf("expected import job status completed, got %#v", createdJob)
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

	var fetchedJob struct {
		JobID       string `json:"job_id"`
		Status      string `json:"status"`
		WorkspaceID int64  `json:"workspace_id"`
	}
	mustDecodeJSON(t, jobStatus.Body.Bytes(), &fetchedJob)
	if fetchedJob.Status != "completed" {
		t.Fatalf("expected fetched import job status completed, got %#v", fetchedJob)
	}

	authorization := basicAuthorization("importer@example.com", "secret1")

	clients := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(*bootstrapResponse.CurrentWorkspaceID)+"/clients",
		nil,
		authorization,
	)
	if clients.Code != http.StatusOK {
		t.Fatalf("expected clients status 200, got %d body=%s", clients.Code, clients.Body.String())
	}
	var clientsBody []struct {
		ID       int64  `json:"id"`
		Name     string `json:"name"`
		Archived bool   `json:"archived"`
	}
	mustDecodeJSON(t, clients.Body.Bytes(), &clientsBody)
	if len(clientsBody) != 1 || clientsBody[0].ID != 57870165 || clientsBody[0].Name != "个人" || clientsBody[0].Archived {
		t.Fatalf("expected imported client in API response, got %#v", clientsBody)
	}

	tags := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(*bootstrapResponse.CurrentWorkspaceID)+"/tags",
		nil,
		authorization,
	)
	if tags.Code != http.StatusOK {
		t.Fatalf("expected tags status 200, got %d body=%s", tags.Code, tags.Body.String())
	}
	var tagsBody []struct {
		ID   int64  `json:"id"`
		Name string `json:"name"`
	}
	mustDecodeJSON(t, tags.Body.Bytes(), &tagsBody)
	if len(tagsBody) != 1 || tagsBody[0].ID != 7215643 || tagsBody[0].Name != "1 象限" {
		t.Fatalf("expected imported tag in API response, got %#v", tagsBody)
	}

	projects := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(*bootstrapResponse.CurrentWorkspaceID)+"/projects?name=toggl%20CLI&page=1&sort_field=name&sort_order=ASC&only_templates=false&sort_pinned=true&search=toggl",
		nil,
		authorization,
	)
	if projects.Code != http.StatusOK {
		t.Fatalf("expected projects status 200, got %d body=%s", projects.Code, projects.Body.String())
	}
	var projectsBody []struct {
		ID            int64  `json:"id"`
		Name          string `json:"name"`
		ClientID      *int64 `json:"client_id"`
		ActualSeconds int64  `json:"actual_seconds"`
	}
	mustDecodeJSON(t, projects.Body.Bytes(), &projectsBody)
	if len(projectsBody) != 1 || projectsBody[0].ID != 218647578 || projectsBody[0].Name != "toggl CLI" || projectsBody[0].ClientID == nil || *projectsBody[0].ClientID != 57870165 || projectsBody[0].ActualSeconds != 17893 {
		t.Fatalf("expected imported project in API response, got %#v", projectsBody)
	}

	workspaceUsers := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(*bootstrapResponse.CurrentWorkspaceID)+"/workspace_users?includeIndirect=false",
		nil,
		authorization,
	)
	if workspaceUsers.Code != http.StatusOK {
		t.Fatalf("expected workspace users status 200, got %d body=%s", workspaceUsers.Code, workspaceUsers.Body.String())
	}
	var workspaceUsersBody []struct {
		ID     int64  `json:"id"`
		UserID int64  `json:"user_id"`
		Email  string `json:"email"`
		Role   string `json:"role"`
	}
	mustDecodeJSON(t, workspaceUsers.Body.Bytes(), &workspaceUsersBody)
	if len(workspaceUsersBody) != 2 {
		t.Fatalf("expected two workspace users after import, got %#v", workspaceUsersBody)
	}

	projectUsers := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(*bootstrapResponse.CurrentWorkspaceID)+"/project_users?project_ids=218647578",
		nil,
		authorization,
	)
	if projectUsers.Code != http.StatusOK {
		t.Fatalf("expected project users status 200, got %d body=%s", projectUsers.Code, projectUsers.Body.String())
	}
	var projectUsersBody []struct {
		ProjectID int64 `json:"project_id"`
		UserID    int64 `json:"user_id"`
		Manager   bool  `json:"manager"`
	}
	mustDecodeJSON(t, projectUsers.Body.Bytes(), &projectUsersBody)
	if len(projectUsersBody) != 2 {
		t.Fatalf("expected two imported project users, got %#v", projectUsersBody)
	}

	var importedIdentityUserCount int
	if err := database.Pool.QueryRow(
		context.Background(),
		"select count(*) from identity_users where email = $1",
		"project-user@example.com",
	).Scan(&importedIdentityUserCount); err != nil {
		t.Fatalf("count imported identity users: %v", err)
	}
	if importedIdentityUserCount != 1 {
		t.Fatalf("expected imported identity user to be created, got %d", importedIdentityUserCount)
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
