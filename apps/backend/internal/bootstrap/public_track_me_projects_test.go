package bootstrap

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"testing"

	"opentoggl/backend/apps/backend/internal/platform"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

// flushUserHomeCache clears the user_home redis cache key for a user so
// that a subsequent request re-reads the drifted home value we wrote
// directly to Postgres, rather than the stale signup-time value that
// the cachedUserHomeRepository populated when the user first registered.
func flushUserHomeCache(t *testing.T, redisAddress string, userID int64) {
	t.Helper()
	client, err := platform.NewRedisClient(redisAddress)
	if err != nil {
		t.Fatalf("connect redis: %v", err)
	}
	defer client.Close()
	if err := client.Del(context.Background(), fmt.Sprintf("user_home:%d", userID)); err != nil {
		t.Fatalf("flush user_home cache: %v", err)
	}
}

// TestMeProjectsSeesProjectsWhenHomeDriftsFromDefaultWorkspace locks the
// production bug observed on track.opentoggl.com: a user whose
// web_user_homes row drifted to a workspace they no longer actually use
// (or never created projects in) still has real projects in their
// primary workspace. GET /api/v9/me/projects must not silently return []
// just because the stale "home" pointer disagrees with the workspaces
// the user is actually a member of.
//
// Root cause: /me/projects used to resolve "the user's workspace" via
// web_user_homes alone. That table can fall out of sync with
// identity_users.default_workspace_id or with the set of workspaces the
// user is a member of (org/workspace switches, imports, admin edits).
// The fix aggregates across every workspace the user belongs to, which
// also aligns with official Toggl /me/projects semantics.
func TestMeProjectsSeesProjectsWhenHomeDriftsFromDefaultWorkspace(t *testing.T) {
	database := pgtest.Open(t)
	primaryEmail := uniqueTestEmail("me-projects-drift-primary")
	decoyEmail := uniqueTestEmail("me-projects-drift-decoy")

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

	// Register the user whose /me/projects we will call.
	primaryRegister := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    primaryEmail,
		"fullname": "Primary User",
		"password": "secret1",
	}, "")
	if primaryRegister.Code != http.StatusCreated {
		t.Fatalf("register primary: got %d body=%s", primaryRegister.Code, primaryRegister.Body.String())
	}
	var primaryBody struct {
		User struct {
			ID int64 `json:"id"`
		} `json:"user"`
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, primaryRegister.Body.Bytes(), &primaryBody)
	if primaryBody.CurrentWorkspaceID == nil {
		t.Fatalf("expected primary workspace id, got %#v", primaryBody)
	}
	primaryWorkspaceID := *primaryBody.CurrentWorkspaceID
	primaryAuth := basicAuthorization(primaryEmail, "secret1")

	// Register a decoy user whose workspace we'll point primary's
	// (stale) home at. The primary user is NOT a member of this
	// decoy workspace — it stands in for "some other workspace the
	// home pointer drifted to". This reproduces the prod state where
	// web_user_homes.workspace_id no longer matches the workspace
	// where the user's projects actually live.
	decoyRegister := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    decoyEmail,
		"fullname": "Decoy User",
		"password": "secret1",
	}, "")
	if decoyRegister.Code != http.StatusCreated {
		t.Fatalf("register decoy: got %d body=%s", decoyRegister.Code, decoyRegister.Body.String())
	}
	var decoyBody struct {
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, decoyRegister.Body.Bytes(), &decoyBody)
	if decoyBody.CurrentWorkspaceID == nil {
		t.Fatalf("expected decoy workspace id, got %#v", decoyBody)
	}
	decoyWorkspaceID := *decoyBody.CurrentWorkspaceID

	// Primary creates a real project in their own workspace.
	createProject := performAuthorizedJSONRequest(
		t, app, http.MethodPost,
		"/api/v9/workspaces/"+intToString(primaryWorkspaceID)+"/projects",
		map[string]any{
			"name":         "Primary Real Project",
			"workspace_id": primaryWorkspaceID,
			"active":       true,
		},
		primaryAuth,
	)
	if createProject.Code != http.StatusOK {
		t.Fatalf("create project: got %d body=%s", createProject.Code, createProject.Body.String())
	}
	var createdProject map[string]any
	mustDecodeJSON(t, createProject.Body.Bytes(), &createdProject)
	createdProjectID := int64(createdProject["id"].(float64))

	// Simulate the prod drift: repoint primary's home to an unrelated
	// workspace that the primary user is not a member of. This is the
	// production scenario captured from DB inspection.
	_, err = database.Pool.Exec(
		context.Background(),
		`UPDATE web_user_homes
		    SET workspace_id = $1,
		        organization_id = (SELECT organization_id FROM tenant_workspaces WHERE id = $1)
		  WHERE user_id = $2`,
		decoyWorkspaceID,
		primaryBody.User.ID,
	)
	if err != nil {
		t.Fatalf("drift home pointer: %v", err)
	}

	// The user_home lookup is Redis-cached by user_id; the raw UPDATE
	// above bypasses that cache. Flush the key so the next request
	// re-reads the drifted home value — this is the state prod ends up
	// in once the cache expires or the instance restarts.
	flushUserHomeCache(t, app.Platform.Redis.Address(), primaryBody.User.ID)

	// GET /me/projects must still return the project that actually
	// exists in a workspace the primary user is a member of.
	resp := performAuthorizedJSONRequest(
		t, app, http.MethodGet, "/api/v9/me/projects", nil, primaryAuth,
	)
	if resp.Code != http.StatusOK {
		t.Fatalf("me projects: got %d body=%s", resp.Code, resp.Body.String())
	}
	var projects []map[string]any
	mustDecodeJSON(t, resp.Body.Bytes(), &projects)
	if len(projects) != 1 {
		t.Fatalf("expected 1 project across user's workspaces after home drift, got %d body=%s",
			len(projects), resp.Body.String())
	}
	if int64(projects[0]["id"].(float64)) != createdProjectID {
		t.Fatalf("expected project id %d, got %d", createdProjectID, int64(projects[0]["id"].(float64)))
	}
}

// TestMeProjectsAggregatesAcrossAllUserWorkspaces verifies that
// GET /api/v9/me/projects returns projects from every workspace the
// authenticated user is a member of, matching official Toggl v9
// semantics. Previously the endpoint only returned projects from the
// user's single "home" workspace, so any user with access to multiple
// workspaces silently lost projects from the non-home ones.
func TestMeProjectsAggregatesAcrossAllUserWorkspaces(t *testing.T) {
	database := pgtest.Open(t)
	aliceEmail := uniqueTestEmail("me-projects-multi-alice")
	bobEmail := uniqueTestEmail("me-projects-multi-bob")

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

	// Alice — home workspace, will have one project.
	aliceRegister := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    aliceEmail,
		"fullname": "Alice",
		"password": "secret1",
	}, "")
	if aliceRegister.Code != http.StatusCreated {
		t.Fatalf("register alice: %d", aliceRegister.Code)
	}
	var aliceBody struct {
		User struct {
			ID int64 `json:"id"`
		} `json:"user"`
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, aliceRegister.Body.Bytes(), &aliceBody)
	aliceWorkspaceID := *aliceBody.CurrentWorkspaceID
	aliceAuth := basicAuthorization(aliceEmail, "secret1")

	// Bob — different workspace, will invite Alice as member and
	// create a project there. That project should show up for Alice
	// on /me/projects.
	bobRegister := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    bobEmail,
		"fullname": "Bob",
		"password": "secret1",
	}, "")
	if bobRegister.Code != http.StatusCreated {
		t.Fatalf("register bob: %d", bobRegister.Code)
	}
	var bobBody struct {
		User struct {
			ID int64 `json:"id"`
		} `json:"user"`
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, bobRegister.Body.Bytes(), &bobBody)
	bobWorkspaceID := *bobBody.CurrentWorkspaceID
	bobAuth := basicAuthorization(bobEmail, "secret1")

	// Bob creates a project in his workspace.
	createBobProject := performAuthorizedJSONRequest(
		t, app, http.MethodPost,
		"/api/v9/workspaces/"+intToString(bobWorkspaceID)+"/projects",
		map[string]any{
			"name":         "Bob Shared Project",
			"workspace_id": bobWorkspaceID,
			"active":       true,
		},
		bobAuth,
	)
	if createBobProject.Code != http.StatusOK {
		t.Fatalf("bob create project: %d body=%s", createBobProject.Code, createBobProject.Body.String())
	}
	var bobProject map[string]any
	mustDecodeJSON(t, createBobProject.Body.Bytes(), &bobProject)
	bobProjectID := int64(bobProject["id"].(float64))

	// Add Alice as a member of Bob's workspace.
	_, err = database.Pool.Exec(
		context.Background(),
		`INSERT INTO membership_workspace_members (workspace_id, user_id, email, full_name, role, state, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		bobWorkspaceID,
		aliceBody.User.ID,
		aliceEmail,
		"Alice",
		"member",
		"joined",
		bobBody.User.ID,
	)
	if err != nil {
		t.Fatalf("add alice to bob workspace: %v", err)
	}

	// Alice creates a project in her own workspace.
	createAliceProject := performAuthorizedJSONRequest(
		t, app, http.MethodPost,
		"/api/v9/workspaces/"+intToString(aliceWorkspaceID)+"/projects",
		map[string]any{
			"name":         "Alice Home Project",
			"workspace_id": aliceWorkspaceID,
			"active":       true,
		},
		aliceAuth,
	)
	if createAliceProject.Code != http.StatusOK {
		t.Fatalf("alice create project: %d body=%s", createAliceProject.Code, createAliceProject.Body.String())
	}
	var aliceProject map[string]any
	mustDecodeJSON(t, createAliceProject.Body.Bytes(), &aliceProject)
	aliceProjectID := int64(aliceProject["id"].(float64))

	// /me/projects for Alice must include both workspaces' projects.
	resp := performAuthorizedJSONRequest(
		t, app, http.MethodGet, "/api/v9/me/projects", nil, aliceAuth,
	)
	if resp.Code != http.StatusOK {
		t.Fatalf("alice me projects: %d body=%s", resp.Code, resp.Body.String())
	}
	var projects []map[string]any
	mustDecodeJSON(t, resp.Body.Bytes(), &projects)

	seen := make(map[int64]bool, len(projects))
	for _, p := range projects {
		seen[int64(p["id"].(float64))] = true
	}
	if !seen[aliceProjectID] {
		t.Fatalf("expected alice home project %d in /me/projects, got %+v", aliceProjectID, projects)
	}
	if !seen[bobProjectID] {
		t.Fatalf("expected bob shared project %d in /me/projects (alice is a member of bob's workspace), got %+v", bobProjectID, projects)
	}
}

// TestMeProjectsEmitsOfficialTogglTimeFormat locks the serialization
// format of time-valued fields (at, created_at) on /me/projects to
// match official api.track.toggl.com exactly: ISO 8601 with an
// explicit numeric offset, e.g. "2024-01-05T05:19:31+00:00", NOT
// Go's default RFC3339 "Z" shortcut. Strict third-party parsers
// (Rust reqwest + chrono's strict ISO, typed TypeScript SDKs) reject
// the "Z" form, which is the kind of drift that breaks the toggl-cli
// Go client on non-CLI languages.
func TestMeProjectsEmitsOfficialTogglTimeFormat(t *testing.T) {
	database := pgtest.Open(t)
	email := uniqueTestEmail("me-projects-tz")

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

	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    email,
		"fullname": "TZ Tester",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("register: %d body=%s", register.Code, register.Body.String())
	}
	var registerBody struct {
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &registerBody)
	workspaceID := *registerBody.CurrentWorkspaceID
	auth := basicAuthorization(email, "secret1")

	create := performAuthorizedJSONRequest(
		t, app, http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects",
		map[string]any{"name": "TZ Probe", "workspace_id": workspaceID, "active": true},
		auth,
	)
	if create.Code != http.StatusOK {
		t.Fatalf("create: %d body=%s", create.Code, create.Body.String())
	}

	resp := performAuthorizedJSONRequest(
		t, app, http.MethodGet, "/api/v9/me/projects", nil, auth,
	)
	if resp.Code != http.StatusOK {
		t.Fatalf("me projects: %d body=%s", resp.Code, resp.Body.String())
	}
	var projects []map[string]any
	mustDecodeJSON(t, resp.Body.Bytes(), &projects)
	if len(projects) == 0 {
		t.Fatalf("expected at least 1 project")
	}

	// Every time-valued field must end with "+00:00" (or another
	// numeric offset), never "Z". Iterate across projects and fields
	// so any regression in a single field fails this test.
	timeFields := []string{"at", "created_at"}
	for _, p := range projects {
		for _, field := range timeFields {
			raw, ok := p[field].(string)
			if !ok || raw == "" {
				continue
			}
			if strings.HasSuffix(raw, "Z") {
				t.Fatalf("field %q on /me/projects response must use numeric offset (official Toggl format), got %q", field, raw)
			}
			if !strings.Contains(raw, "+") && !strings.Contains(raw[len(raw)-6:], "-") {
				t.Fatalf("field %q has no numeric offset: %q", field, raw)
			}
		}
	}
}

// TestMeProjectsHidesArchivedByDefault locks the official Toggl v9
// behavior empirically confirmed against api.track.toggl.com: GET
// /me/projects returns ONLY active projects by default. Archived
// projects live at /workspaces/{id}/projects (which always lists all),
// or are opted in via include_archived=true. The previous
// implementation leaked archived projects through /me/projects because
// it shared the workspace-scoped handler's "no active filter" default.
func TestMeProjectsHidesArchivedByDefault(t *testing.T) {
	database := pgtest.Open(t)
	email := uniqueTestEmail("me-projects-archived")

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

	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    email,
		"fullname": "Archive Tester",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("register: %d body=%s", register.Code, register.Body.String())
	}
	var registerBody struct {
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &registerBody)
	workspaceID := *registerBody.CurrentWorkspaceID
	auth := basicAuthorization(email, "secret1")

	// Create one active + one archived project in the same workspace.
	active := performAuthorizedJSONRequest(
		t, app, http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects",
		map[string]any{"name": "Still Active", "workspace_id": workspaceID, "active": true},
		auth,
	)
	if active.Code != http.StatusOK {
		t.Fatalf("create active: %d body=%s", active.Code, active.Body.String())
	}
	var activeProject map[string]any
	mustDecodeJSON(t, active.Body.Bytes(), &activeProject)
	activeID := int64(activeProject["id"].(float64))

	archived := performAuthorizedJSONRequest(
		t, app, http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects",
		map[string]any{"name": "Archived", "workspace_id": workspaceID, "active": false},
		auth,
	)
	if archived.Code != http.StatusOK {
		t.Fatalf("create archived: %d body=%s", archived.Code, archived.Body.String())
	}
	var archivedProject map[string]any
	mustDecodeJSON(t, archived.Body.Bytes(), &archivedProject)
	archivedID := int64(archivedProject["id"].(float64))

	// Default /me/projects must hide the archived project.
	resp := performAuthorizedJSONRequest(
		t, app, http.MethodGet, "/api/v9/me/projects", nil, auth,
	)
	if resp.Code != http.StatusOK {
		t.Fatalf("me projects: %d body=%s", resp.Code, resp.Body.String())
	}
	var projects []map[string]any
	mustDecodeJSON(t, resp.Body.Bytes(), &projects)
	seen := make(map[int64]bool, len(projects))
	for _, p := range projects {
		seen[int64(p["id"].(float64))] = true
	}
	if !seen[activeID] {
		t.Fatalf("expected active project %d in /me/projects default response, got %+v", activeID, projects)
	}
	if seen[archivedID] {
		t.Fatalf("archived project %d must NOT appear in /me/projects default response (official Toggl hides archived unless include_archived=true); got %+v", archivedID, projects)
	}

	// Workspace-scoped listing keeps its "return everything" default,
	// so both active and archived must be visible there. This guards
	// against accidentally propagating the /me-only active filter to
	// /workspaces/{id}/projects.
	wsResp := performAuthorizedJSONRequest(
		t, app, http.MethodGet,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects",
		nil, auth,
	)
	if wsResp.Code != http.StatusOK {
		t.Fatalf("workspace projects: %d body=%s", wsResp.Code, wsResp.Body.String())
	}
	var wsProjects []map[string]any
	mustDecodeJSON(t, wsResp.Body.Bytes(), &wsProjects)
	wsSeen := make(map[int64]bool, len(wsProjects))
	for _, p := range wsProjects {
		wsSeen[int64(p["id"].(float64))] = true
	}
	if !wsSeen[activeID] || !wsSeen[archivedID] {
		t.Fatalf("expected both active and archived in workspace listing, got %+v", wsProjects)
	}
}
