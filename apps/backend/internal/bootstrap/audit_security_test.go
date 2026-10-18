package bootstrap

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"

	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

type auditTestUser struct {
	ID             int64
	WorkspaceID    int64
	OrganizationID int64
	Authorization  string
}

type auditTestPayload struct {
	Name string `json:"name"`
}
type auditTestRecord struct {
	RequestBody  string `json:"request_body"`
	ResponseBody string `json:"response_body"`
	Metadata     string `json:"metadata"`
}

func newAuditSecurityApp(t *testing.T) *App {
	t.Helper()
	database := pgtest.Open(t)
	app, err := NewApp(Config{ServiceName: "audit-security", Server: ServerConfig{ListenAddress: ":0"}, Database: DatabaseConfig{PrimaryDSN: database.ConnString()}, Redis: RedisConfig{Address: "redis://127.0.0.1:6379/0"}})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(app.Platform.Database.Close)
	return app
}

func registerAuditUser(t *testing.T, app *App) auditTestUser {
	t.Helper()
	email := uniqueTestEmail("audit-security")
	request := struct {
		Email    string `json:"email"`
		Fullname string `json:"fullname"`
		Password string `json:"password"`
	}{email, "Audit Owner", "security-test-password"}
	response := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", request, "")
	if response.Code != http.StatusCreated {
		t.Fatalf("register: %d %s", response.Code, response.Body)
	}
	var body struct {
		User struct {
			ID int64 `json:"id"`
		} `json:"user"`
		WorkspaceID    int64 `json:"current_workspace_id"`
		OrganizationID int64 `json:"current_organization_id"`
	}
	mustDecodeJSON(t, response.Body.Bytes(), &body)
	user := auditTestUser{body.User.ID, body.WorkspaceID, body.OrganizationID, basicAuthorization(email, request.Password)}
	if user.OrganizationID == 0 {
		t.Fatal("missing organization")
	}
	return user
}

func createAuditProject(t *testing.T, app *App, user auditTestUser, name string) int64 {
	t.Helper()
	response := performAuthorizedJSONRequest(t, app, http.MethodPost, fmt.Sprintf("/api/v9/workspaces/%d/projects", user.WorkspaceID), auditTestPayload{name}, user.Authorization)
	if response.Code != http.StatusOK {
		t.Fatalf("create project: %d %s", response.Code, response.Body)
	}
	var body struct {
		ID int64 `json:"id"`
	}
	mustDecodeJSON(t, response.Body.Bytes(), &body)
	return body.ID
}

func awaitAuditRecord(t *testing.T, app *App, userID int64, action string) auditTestRecord {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	ticker := time.NewTicker(10 * time.Millisecond)
	defer ticker.Stop()
	for {
		var record auditTestRecord
		err := app.Platform.Database.Pool().QueryRow(ctx, `select request_body, response_body, metadata from governance_audit_logs where user_id=$1 and action=$2 order by id desc limit 1`, userID, action).Scan(&record.RequestBody, &record.ResponseBody, &record.Metadata)
		if err == nil {
			return record
		}
		select {
		case <-ctx.Done():
			t.Fatalf("audit record missing: %s: %v", action, err)
		case <-ticker.C:
		}
	}
}

func TestAuditSecurityDeniedMutationCannotExposeOtherTenant(t *testing.T) {
	app := newAuditSecurityApp(t)
	attacker, victim := registerAuditUser(t, app), registerAuditUser(t, app)
	victimProject := createAuditProject(t, app, victim, "victim-confidential-project")
	// Valid attacker workspace plus another tenant's entity ID must not leak
	// the previous row through the attacker's own audit-log read API.
	path := fmt.Sprintf("/api/v9/workspaces/%d/projects/%d", attacker.WorkspaceID, victimProject)
	response := performAuthorizedJSONRequest(t, app, http.MethodPut, path, auditTestPayload{"attempt"}, attacker.Authorization)
	if response.Code < 400 {
		t.Fatalf("cross-tenant mutation accepted: %d", response.Code)
	}
	record := awaitAuditRecord(t, app, attacker.ID, "PUT "+path)
	if record.Metadata != "" || record.ResponseBody != "" || record.RequestBody != "" {
		t.Fatalf("rejected mutation retained payload: %+v", record)
	}
	auditPath := fmt.Sprintf("/api/v9/audit_logs/%d/%s/%s", attacker.OrganizationID, time.Now().UTC().Add(-time.Hour).Format(time.RFC3339), time.Now().UTC().Add(time.Hour).Format(time.RFC3339))
	logs := performAuthorizedJSONRequest(t, app, http.MethodGet, auditPath, nil, attacker.Authorization)
	if logs.Code != http.StatusOK {
		t.Fatalf("own audit read: %d %s", logs.Code, logs.Body)
	}
	if strings.Contains(logs.Body.String(), "victim-confidential-project") {
		t.Fatal("victim data leaked through own audit API")
	}
}

func TestAuditSecurityAllowedMutationKeepsScopedPreviousState(t *testing.T) {
	app := newAuditSecurityApp(t)
	owner := registerAuditUser(t, app)
	projectID := createAuditProject(t, app, owner, "before")
	path := fmt.Sprintf("/api/v9/workspaces/%d/projects/%d", owner.WorkspaceID, projectID)
	response := performAuthorizedJSONRequest(t, app, http.MethodPut, path, auditTestPayload{"after"}, owner.Authorization)
	if response.Code != http.StatusOK {
		t.Fatalf("own mutation: %d %s", response.Code, response.Body)
	}
	record := awaitAuditRecord(t, app, owner.ID, "PUT "+path)
	if !strings.Contains(record.Metadata, "before") || !strings.Contains(record.ResponseBody, "after") {
		t.Fatalf("missing authorized audit data: %+v", record)
	}
}

func TestAuditSecurityTokenRotationDoesNotPersistCredential(t *testing.T) {
	app := newAuditSecurityApp(t)
	owner := registerAuditUser(t, app)
	path := "/api/v9/me/reset_token"
	response := performAuthorizedJSONRequest(t, app, http.MethodPost, path, nil, owner.Authorization)
	if response.Code != http.StatusOK {
		t.Fatalf("rotate: %d %s", response.Code, response.Body)
	}
	var token string
	mustDecodeJSON(t, response.Body.Bytes(), &token)
	record := awaitAuditRecord(t, app, owner.ID, "POST "+path)
	if strings.Contains(record.ResponseBody, token) {
		t.Fatal("API credential persisted in audit log")
	}
	// Rotation still produces a usable credential.
	me := performAuthorizedJSONRequest(t, app, http.MethodGet, "/api/v9/me", nil, basicAuthorization(token, "api_token"))
	if me.Code != http.StatusOK {
		t.Fatalf("rotated credential unusable: %d", me.Code)
	}
}

func TestAuditSecurityLargeRequestIsNotTruncated(t *testing.T) {
	app := newAuditSecurityApp(t)
	owner := registerAuditUser(t, app)
	name := strings.Repeat("long-project-", 800)
	response := performAuthorizedJSONRequest(t, app, http.MethodPost, fmt.Sprintf("/api/v9/workspaces/%d/projects", owner.WorkspaceID), auditTestPayload{name}, owner.Authorization)
	if response.Code != http.StatusOK {
		t.Fatalf("valid >8KiB request truncated: %d %s", response.Code, response.Body)
	}
	var body auditTestPayload
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body.Name != name {
		t.Fatal("request content changed")
	}
}

func TestAuditSecurityHistoricalPayloadsCannotLeak(t *testing.T) {
	app := newAuditSecurityApp(t)
	owner, victim := registerAuditUser(t, app), registerAuditUser(t, app)
	// Reproduce rows persisted by previous releases, without going through the
	// corrected insert path. Reading old data must also enforce the boundary.
	_, err := app.Platform.Database.Pool().Exec(context.Background(), `insert into governance_audit_logs
 (organization_id,workspace_id,action,user_id,request_body,response_body,metadata)
 values ($1,$2,'PUT /api/v9/workspaces/1/projects/1',$3,'{"nested":{"api_token":"historic-secret"}}','{"name":"safe-project"}',$4),
 ($1,$5,'PUT /api/v9/workspaces/1/projects/2',$3,'','{"name":"victim-response"}',$6)`,
		owner.OrganizationID, owner.WorkspaceID, owner.ID, fmt.Sprintf(`{"previous":{"workspace_id":%d,"name":"victim-previous"}}`, victim.WorkspaceID), victim.WorkspaceID, fmt.Sprintf(`{"previous":{"workspace_id":%d,"name":"victim-other-org"}}`, victim.WorkspaceID))
	if err != nil {
		t.Fatal(err)
	}
	path := fmt.Sprintf("/api/v9/audit_logs/%d/%s/%s", owner.OrganizationID, time.Now().UTC().Add(-time.Hour).Format(time.RFC3339), time.Now().UTC().Add(time.Hour).Format(time.RFC3339))
	response := performAuthorizedJSONRequest(t, app, http.MethodGet, path, nil, owner.Authorization)
	if response.Code != http.StatusOK {
		t.Fatalf("audit read: %d %s", response.Code, response.Body)
	}
	for _, forbidden := range []string{"historic-secret", "victim-previous", "victim-response", "victim-other-org"} {
		if strings.Contains(response.Body.String(), forbidden) {
			t.Errorf("historical audit leaks %s", forbidden)
		}
	}
	if !strings.Contains(response.Body.String(), "safe-project") {
		t.Fatal("legitimate historical response lost")
	}
}

func TestAuditSecurityAttributesNonHomeWorkspaceToItsOrganization(t *testing.T) {
	app := newAuditSecurityApp(t)
	owner := registerAuditUser(t, app)
	payload := struct {
		Name          string `json:"name"`
		WorkspaceName string `json:"workspace_name"`
	}{"Second organization", "Second workspace"}
	created := performAuthorizedJSONRequest(t, app, http.MethodPost, "/api/v9/organizations", payload, owner.Authorization)
	if created.Code != http.StatusOK {
		t.Fatalf("create second org: %d %s", created.Code, created.Body)
	}
	var workspaceID, organizationID int64
	err := app.Platform.Database.Pool().QueryRow(context.Background(), `select w.id,w.organization_id from tenant_workspaces w join membership_workspace_members m on m.workspace_id=w.id where m.user_id=$1 and w.organization_id<>$2 order by w.id desc limit 1`, owner.ID, owner.OrganizationID).Scan(&workspaceID, &organizationID)
	if err != nil {
		t.Fatal(err)
	}
	second := owner
	second.WorkspaceID = workspaceID
	projectID := createAuditProject(t, app, second, "second-org-before")
	path := fmt.Sprintf("/api/v9/workspaces/%d/projects/%d", workspaceID, projectID)
	updated := performAuthorizedJSONRequest(t, app, http.MethodPut, path, auditTestPayload{"second-org-after"}, owner.Authorization)
	if updated.Code != http.StatusOK {
		t.Fatalf("update second org: %d %s", updated.Code, updated.Body)
	}
	record := awaitAuditRecord(t, app, owner.ID, "PUT "+path)
	if !strings.Contains(record.Metadata, "second-org-before") {
		t.Fatal("missing own second-org previous state")
	}
	var actualOrg int64
	if err := app.Platform.Database.Pool().QueryRow(context.Background(), `select organization_id from governance_audit_logs where user_id=$1 and action=$2 order by id desc limit 1`, owner.ID, "PUT "+path).Scan(&actualOrg); err != nil {
		t.Fatal(err)
	}
	if actualOrg != organizationID {
		t.Fatalf("wrong organization: got %d want %d", actualOrg, organizationID)
	}
}

func TestAuditSecuritySQLMetacharactersRemainOrdinaryData(t *testing.T) {
	app := newAuditSecurityApp(t)
	owner := registerAuditUser(t, app)
	name := "O'Reilly'); DROP TABLE catalog_projects; --"
	projectID := createAuditProject(t, app, owner, name)
	response := performAuthorizedJSONRequest(t, app, http.MethodGet, fmt.Sprintf("/api/v9/workspaces/%d/projects/%d", owner.WorkspaceID, projectID), nil, owner.Authorization)
	if response.Code != http.StatusOK {
		t.Fatalf("read project: %d %s", response.Code, response.Body)
	}
	var project auditTestPayload
	mustDecodeJSON(t, response.Body.Bytes(), &project)
	if project.Name != name {
		t.Fatal("SQL metacharacters did not round-trip as data")
	}
	createAuditProject(t, app, owner, "table-remains-usable")
}
