package bootstrap

import (
	"net/http"
	"testing"
	"time"

	publicreportsapi "opentoggl/backend/apps/backend/internal/http/generated/publicreports"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestPublicReportsRoutesServeWeeklyAndSummaryData(t *testing.T) {
	database := pgtest.Open(t)
	uniqueEmail := uniqueTestEmail("reports-surface")
	baseStart := time.Date(2026, time.March, 23, 9, 0, 0, 0, time.UTC)
	secondStart := baseStart.Add(24 * time.Hour)
	secondStop := secondStart.Add(time.Hour)

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
		"email":    uniqueEmail,
		"fullname": "Reports Surface",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}

	var registerBody struct {
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &registerBody)
	if registerBody.CurrentWorkspaceID == nil {
		t.Fatal("expected current workspace id")
	}
	workspaceID := *registerBody.CurrentWorkspaceID
	authorization := basicAuthorization(uniqueEmail, "secret1")

	createProject := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects",
		map[string]any{"name": "Client Delivery"},
		authorization,
	)
	if createProject.Code != http.StatusOK {
		t.Fatalf("expected project create status 200, got %d body=%s", createProject.Code, createProject.Body.String())
	}
	var projectBody map[string]any
	mustDecodeJSON(t, createProject.Body.Bytes(), &projectBody)
	projectID := int64(projectBody["id"].(float64))

	firstEntry := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/time_entries",
		map[string]any{
			"billable":     true,
			"created_with": "reports-test",
			"description":  "Deep work",
			"duration":     7200,
			"project_id":   projectID,
			"start":        baseStart.Format(time.RFC3339),
			"stop":         baseStart.Add(2 * time.Hour).Format(time.RFC3339),
			"workspace_id": workspaceID,
		},
		authorization,
	)
	if firstEntry.Code != http.StatusOK {
		t.Fatalf("expected first time entry status 200, got %d body=%s", firstEntry.Code, firstEntry.Body.String())
	}

	secondEntry := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/time_entries",
		map[string]any{
			"created_with": "reports-test",
			"description":  "Review",
			"duration":     3600,
			"project_id":   projectID,
			"start":        secondStart.Format(time.RFC3339),
			"stop":         secondStop.Format(time.RFC3339),
			"workspace_id": workspaceID,
		},
		authorization,
	)
	if secondEntry.Code != http.StatusOK {
		t.Fatalf("expected second time entry status 200, got %d body=%s", secondEntry.Code, secondEntry.Body.String())
	}

	weekly := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/reports/api/v3/workspace/"+intToString(workspaceID)+"/weekly/time_entries",
		map[string]any{
			"end_date":   "2026-03-29",
			"start_date": "2026-03-23",
		},
		authorization,
	)
	if weekly.Code != http.StatusOK {
		t.Fatalf("expected weekly report status 200, got %d body=%s", weekly.Code, weekly.Body.String())
	}
	var weeklyBody publicreportsapi.SavedWeeklyReportData
	mustDecodeJSON(t, weekly.Body.Bytes(), &weeklyBody)
	if weeklyBody.Totals == nil || weeklyBody.Totals.Seconds == nil || *weeklyBody.Totals.Seconds != 10800 {
		t.Fatalf("expected weekly totals seconds 10800, got %#v", weeklyBody.Totals)
	}
	if weeklyBody.Totals == nil || weeklyBody.Totals.TrackedDays == nil || *weeklyBody.Totals.TrackedDays != 2 {
		t.Fatalf("expected weekly tracked days 2, got %#v", weeklyBody.Totals)
	}
	if weeklyBody.Report == nil || len(*weeklyBody.Report) != 1 {
		t.Fatalf("expected one weekly row, got %#v", weeklyBody.Report)
	}
	row := (*weeklyBody.Report)[0]
	if row.ProjectName == nil || *row.ProjectName != "Client Delivery" {
		t.Fatalf("expected project name Client Delivery, got %#v", row.ProjectName)
	}
	if row.Seconds == nil || len(*row.Seconds) != 7 || (*row.Seconds)[0] != 7200 || (*row.Seconds)[1] != 3600 {
		t.Fatalf("expected weekly seconds on first two days, got %#v", row.Seconds)
	}
	if row.BillableSeconds == nil || (*row.BillableSeconds)[0] != 7200 || (*row.BillableSeconds)[1] != 0 {
		t.Fatalf("expected billable seconds to follow billable entry only, got %#v", row.BillableSeconds)
	}

	summary := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/reports/api/v3/workspace/"+intToString(workspaceID)+"/summary/time_entries",
		map[string]any{
			"end_date":   "2026-03-29",
			"start_date": "2026-03-23",
		},
		authorization,
	)
	if summary.Code != http.StatusOK {
		t.Fatalf("expected summary report status 200, got %d body=%s", summary.Code, summary.Body.String())
	}
	var summaryBody publicreportsapi.SavedSummaryReportData
	mustDecodeJSON(t, summary.Body.Bytes(), &summaryBody)
	if summaryBody.Totals == nil || summaryBody.Totals.Seconds == nil || *summaryBody.Totals.Seconds != 10800 {
		t.Fatalf("expected summary totals seconds 10800, got %#v", summaryBody.Totals)
	}
	if summaryBody.Report == nil || summaryBody.Report.Groups == nil || len(*summaryBody.Report.Groups) != 1 {
		t.Fatalf("expected one summary group, got %#v", summaryBody.Report)
	}
}

// TestPublicReportsSearchTimeEntriesNullProjectFilter verifies the Toggl
// documented "[null]" filter semantics: POST
// /reports/api/v3/workspace/{id}/search/time_entries with project_ids: [null]
// returns only entries without a project (and similarly for tag_ids: [null]).
// Regression test for a validator 400 that rejected [null] as non-nullable.
func TestPublicReportsSearchTimeEntriesNullProjectFilter(t *testing.T) {
	database := pgtest.Open(t)
	uniqueEmail := uniqueTestEmail("reports-null-filter")
	entryStart := time.Date(2026, time.March, 23, 9, 0, 0, 0, time.UTC)

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
		"email":    uniqueEmail,
		"fullname": "Reports Null Filter",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}
	var registerBody struct {
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &registerBody)
	workspaceID := *registerBody.CurrentWorkspaceID
	authorization := basicAuthorization(uniqueEmail, "secret1")

	createProject := performAuthorizedJSONRequest(
		t, app, http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects",
		map[string]any{"name": "Billable Project"},
		authorization,
	)
	if createProject.Code != http.StatusOK {
		t.Fatalf("expected project create status 200, got %d body=%s", createProject.Code, createProject.Body.String())
	}
	var projectBody map[string]any
	mustDecodeJSON(t, createProject.Body.Bytes(), &projectBody)
	projectID := int64(projectBody["id"].(float64))

	// Entry A: has a project.
	withProject := performAuthorizedJSONRequest(
		t, app, http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/time_entries",
		map[string]any{
			"created_with": "reports-null-test",
			"description":  "with project",
			"duration":     1800,
			"project_id":   projectID,
			"start":        entryStart.Format(time.RFC3339),
			"stop":         entryStart.Add(30 * time.Minute).Format(time.RFC3339),
			"workspace_id": workspaceID,
		},
		authorization,
	)
	if withProject.Code != http.StatusOK {
		t.Fatalf("entry w/ project: status %d body=%s", withProject.Code, withProject.Body.String())
	}

	// Entry B: no project.
	withoutProject := performAuthorizedJSONRequest(
		t, app, http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/time_entries",
		map[string]any{
			"created_with": "reports-null-test",
			"description":  "no project",
			"duration":     600,
			"start":        entryStart.Add(2 * time.Hour).Format(time.RFC3339),
			"stop":         entryStart.Add(2*time.Hour + 10*time.Minute).Format(time.RFC3339),
			"workspace_id": workspaceID,
		},
		authorization,
	)
	if withoutProject.Code != http.StatusOK {
		t.Fatalf("entry w/o project: status %d body=%s", withoutProject.Code, withoutProject.Body.String())
	}

	// Baseline: no filter returns both entries.
	all := performAuthorizedJSONRequest(
		t, app, http.MethodPost,
		"/reports/api/v3/workspace/"+intToString(workspaceID)+"/search/time_entries",
		map[string]any{"start_date": "2026-03-23", "end_date": "2026-03-23"},
		authorization,
	)
	if all.Code != http.StatusOK {
		t.Fatalf("baseline search: status %d body=%s", all.Code, all.Body.String())
	}
	var allRows []map[string]any
	mustDecodeJSON(t, all.Body.Bytes(), &allRows)
	if len(allRows) != 2 {
		t.Fatalf("baseline expected 2 rows, got %d: %v", len(allRows), allRows)
	}

	// project_ids: [null] must return only the entry without a project.
	nullProject := performAuthorizedJSONRequest(
		t, app, http.MethodPost,
		"/reports/api/v3/workspace/"+intToString(workspaceID)+"/search/time_entries",
		map[string]any{
			"start_date":  "2026-03-23",
			"end_date":    "2026-03-23",
			"project_ids": []any{nil},
		},
		authorization,
	)
	if nullProject.Code != http.StatusOK {
		t.Fatalf("[null] search: status %d body=%s", nullProject.Code, nullProject.Body.String())
	}
	var nullRows []map[string]any
	mustDecodeJSON(t, nullProject.Body.Bytes(), &nullRows)
	if len(nullRows) != 1 {
		t.Fatalf("[null] project filter expected 1 row, got %d: %v", len(nullRows), nullRows)
	}
	if desc, _ := nullRows[0]["description"].(string); desc != "no project" {
		t.Fatalf("[null] project filter expected description 'no project', got %q", desc)
	}
	if _, hasProject := nullRows[0]["project_id"]; hasProject {
		t.Fatalf("expected no project_id on returned row, got %v", nullRows[0])
	}

	// project_ids: [null, projectID] — OR semantics: both entries.
	mixed := performAuthorizedJSONRequest(
		t, app, http.MethodPost,
		"/reports/api/v3/workspace/"+intToString(workspaceID)+"/search/time_entries",
		map[string]any{
			"start_date":  "2026-03-23",
			"end_date":    "2026-03-23",
			"project_ids": []any{nil, projectID},
		},
		authorization,
	)
	if mixed.Code != http.StatusOK {
		t.Fatalf("[null, id] search: status %d body=%s", mixed.Code, mixed.Body.String())
	}
	var mixedRows []map[string]any
	mustDecodeJSON(t, mixed.Body.Bytes(), &mixedRows)
	if len(mixedRows) != 2 {
		t.Fatalf("[null, id] expected 2 rows, got %d: %v", len(mixedRows), mixedRows)
	}

	// Summary report with project_ids:[null] should also honor the filter and
	// only total the no-project entry (10 min = 600s).
	summary := performAuthorizedJSONRequest(
		t, app, http.MethodPost,
		"/reports/api/v3/workspace/"+intToString(workspaceID)+"/summary/time_entries",
		map[string]any{
			"start_date":  "2026-03-23",
			"end_date":    "2026-03-23",
			"project_ids": []any{nil},
		},
		authorization,
	)
	if summary.Code != http.StatusOK {
		t.Fatalf("summary [null] search: status %d body=%s", summary.Code, summary.Body.String())
	}
	var summaryBody publicreportsapi.SavedSummaryReportData
	mustDecodeJSON(t, summary.Body.Bytes(), &summaryBody)
	if summaryBody.Totals == nil || summaryBody.Totals.Seconds == nil || *summaryBody.Totals.Seconds != 600 {
		t.Fatalf("summary [null] expected 600s total, got %#v", summaryBody.Totals)
	}

	// Weekly report with project_ids:[null] likewise.
	weekly := performAuthorizedJSONRequest(
		t, app, http.MethodPost,
		"/reports/api/v3/workspace/"+intToString(workspaceID)+"/weekly/time_entries",
		map[string]any{
			"start_date":  "2026-03-23",
			"end_date":    "2026-03-29",
			"project_ids": []any{nil},
		},
		authorization,
	)
	if weekly.Code != http.StatusOK {
		t.Fatalf("weekly [null] search: status %d body=%s", weekly.Code, weekly.Body.String())
	}
	var weeklyBody publicreportsapi.SavedWeeklyReportData
	mustDecodeJSON(t, weekly.Body.Bytes(), &weeklyBody)
	if weeklyBody.Totals == nil || weeklyBody.Totals.Seconds == nil || *weeklyBody.Totals.Seconds != 600 {
		t.Fatalf("weekly [null] expected 600s total, got %#v", weeklyBody.Totals)
	}
}

// TestPublicReportsProjectsSummaryTogglCompat locks in wire-compatibility with
// the official Toggl Reports v3 endpoint POST
// /reports/api/v3/workspace/{id}/projects/summary.
//
// Source of the drift report: the third-party obsidian-toggl-integration
// plugin (github.com/mcndt/obsidian-toggl-integration) calls this endpoint
// with only `start_date` and consumes `{user_id, project_id, tracked_seconds}`
// rows, including rows where `project_id` is an explicit JSON null for time
// tracked without a project. A user running the plugin against a self-hosted
// OpenToggl instance reported two divergences vs api.track.toggl.com:
//
//  1. OpenToggl returned 400 "At least one parameter must be set" when only
//     `start_date` was sent. Official treats a single bound as a one-day
//     window.
//  2. OpenToggl returned rows shaped `{project_id, user_id, id}` (no
//     `tracked_seconds`, `billable_seconds` missing) and dropped null-project
//     rows entirely, because the handler used the wrong generated type
//     (`DtoProjectUserResponse` instead of `UsersProjectUsersSummaryRow`).
//
// This test pins the fix: start_date-only is accepted, every row carries all
// four documented fields, and a no-project bucket surfaces as project_id: null.
func TestPublicReportsProjectsSummaryTogglCompat(t *testing.T) {
	database := pgtest.Open(t)
	uniqueEmail := uniqueTestEmail("reports-projects-summary")
	entryStart := time.Date(2026, time.March, 23, 9, 0, 0, 0, time.UTC)

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
		"email":    uniqueEmail,
		"fullname": "Projects Summary",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}
	var registerBody struct {
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &registerBody)
	workspaceID := *registerBody.CurrentWorkspaceID
	authorization := basicAuthorization(uniqueEmail, "secret1")

	createProject := performAuthorizedJSONRequest(
		t, app, http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects",
		map[string]any{"name": "Obsidian Compat"},
		authorization,
	)
	if createProject.Code != http.StatusOK {
		t.Fatalf("expected project create status 200, got %d body=%s", createProject.Code, createProject.Body.String())
	}
	var projectBody map[string]any
	mustDecodeJSON(t, createProject.Body.Bytes(), &projectBody)
	projectID := int64(projectBody["id"].(float64))

	// Entry A: 1h billable on the project.
	withProject := performAuthorizedJSONRequest(
		t, app, http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/time_entries",
		map[string]any{
			"billable":     true,
			"created_with": "projects-summary-test",
			"description":  "project work",
			"duration":     3600,
			"project_id":   projectID,
			"start":        entryStart.Format(time.RFC3339),
			"stop":         entryStart.Add(time.Hour).Format(time.RFC3339),
			"workspace_id": workspaceID,
		},
		authorization,
	)
	if withProject.Code != http.StatusOK {
		t.Fatalf("entry w/ project: status %d body=%s", withProject.Code, withProject.Body.String())
	}

	// Entry B: 10min non-billable, no project.
	withoutProject := performAuthorizedJSONRequest(
		t, app, http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/time_entries",
		map[string]any{
			"created_with": "projects-summary-test",
			"description":  "unassigned",
			"duration":     600,
			"start":        entryStart.Add(2 * time.Hour).Format(time.RFC3339),
			"stop":         entryStart.Add(2*time.Hour + 10*time.Minute).Format(time.RFC3339),
			"workspace_id": workspaceID,
		},
		authorization,
	)
	if withoutProject.Code != http.StatusOK {
		t.Fatalf("entry w/o project: status %d body=%s", withoutProject.Code, withoutProject.Body.String())
	}

	// Case 1 (obsidian-toggl-integration wire): only start_date. Must NOT 400.
	startOnly := performAuthorizedJSONRequest(
		t, app, http.MethodPost,
		"/reports/api/v3/workspace/"+intToString(workspaceID)+"/projects/summary",
		map[string]any{"start_date": "2026-03-23"},
		authorization,
	)
	if startOnly.Code != http.StatusOK {
		t.Fatalf("start_date-only: expected 200, got %d body=%s", startOnly.Code, startOnly.Body.String())
	}

	var rows []map[string]any
	mustDecodeJSON(t, startOnly.Body.Bytes(), &rows)
	if len(rows) != 2 {
		t.Fatalf("expected 2 rows (1 project + 1 null-project), got %d: %v", len(rows), rows)
	}

	// Every row must carry all four documented fields, with project_id
	// explicitly present (null-or-int), not omitted.
	var projectRow, nullRow map[string]any
	for _, row := range rows {
		for _, field := range []string{"user_id", "project_id", "tracked_seconds", "billable_seconds"} {
			if _, ok := row[field]; !ok {
				t.Fatalf("row missing field %q: %v", field, row)
			}
		}
		if row["project_id"] == nil {
			nullRow = row
		} else {
			projectRow = row
		}
	}
	if projectRow == nil {
		t.Fatalf("expected a row with a project, got %v", rows)
	}
	if nullRow == nil {
		t.Fatalf("expected a row with project_id: null, got %v", rows)
	}

	if pid, _ := projectRow["project_id"].(float64); int64(pid) != projectID {
		t.Fatalf("project row: project_id=%v, want %d", projectRow["project_id"], projectID)
	}
	if tracked, _ := projectRow["tracked_seconds"].(float64); tracked != 3600 {
		t.Fatalf("project row: tracked_seconds=%v, want 3600", projectRow["tracked_seconds"])
	}
	if billable, _ := projectRow["billable_seconds"].(float64); billable != 3600 {
		t.Fatalf("project row: billable_seconds=%v, want 3600", projectRow["billable_seconds"])
	}

	if tracked, _ := nullRow["tracked_seconds"].(float64); tracked != 600 {
		t.Fatalf("null row: tracked_seconds=%v, want 600", nullRow["tracked_seconds"])
	}
	if billable, _ := nullRow["billable_seconds"].(float64); billable != 0 {
		t.Fatalf("null row: billable_seconds=%v, want 0", nullRow["billable_seconds"])
	}

	// Case 2: neither bound provided still 400 (matches official error).
	neither := performAuthorizedJSONRequest(
		t, app, http.MethodPost,
		"/reports/api/v3/workspace/"+intToString(workspaceID)+"/projects/summary",
		map[string]any{},
		authorization,
	)
	if neither.Code != http.StatusBadRequest {
		t.Fatalf("no bounds: expected 400, got %d body=%s", neither.Code, neither.Body.String())
	}
}

// TestPublicReportsAtLeastOneDateBoundAcrossEndpoints pins the systemic fix
// for the reports-v3 / insights-v1 date-range validation: every endpoint must
// accept a single `start_date` (or `end_date`) as a one-day window. Official
// Toggl semantics are "At least one parameter must be set" — not "both
// required". Previously buildQuery and parseDateRange hard-required both,
// causing third-party clients (like obsidian-toggl-integration) to see 400s
// for valid payloads across ~15 endpoints.
//
// This test exercises one endpoint per shared helper so any regression in
// resolveDateBounds surfaces quickly; more specific shape assertions live in
// the per-endpoint tests above.
func TestPublicReportsAtLeastOneDateBoundAcrossEndpoints(t *testing.T) {
	database := pgtest.Open(t)
	uniqueEmail := uniqueTestEmail("reports-date-bound")
	entryStart := time.Date(2026, time.March, 23, 9, 0, 0, 0, time.UTC)

	app, err := NewApp(Config{
		ServiceName: "opentoggl-api",
		Server:      ServerConfig{ListenAddress: ":0"},
		Database:    DatabaseConfig{PrimaryDSN: database.ConnString()},
		Redis:       RedisConfig{Address: "redis://127.0.0.1:6379/0"},
	})
	if err != nil {
		t.Fatalf("NewApp: %v", err)
	}
	t.Cleanup(app.Platform.Database.Close)

	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    uniqueEmail,
		"fullname": "Date Bound",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("register: %d %s", register.Code, register.Body.String())
	}
	var registerBody struct {
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &registerBody)
	workspaceID := *registerBody.CurrentWorkspaceID
	authorization := basicAuthorization(uniqueEmail, "secret1")

	createProject := performAuthorizedJSONRequest(
		t, app, http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects",
		map[string]any{"name": "Date Bound Project"},
		authorization,
	)
	if createProject.Code != http.StatusOK {
		t.Fatalf("create project: %d %s", createProject.Code, createProject.Body.String())
	}
	var projectBody map[string]any
	mustDecodeJSON(t, createProject.Body.Bytes(), &projectBody)
	projectID := int64(projectBody["id"].(float64))

	entry := performAuthorizedJSONRequest(
		t, app, http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/time_entries",
		map[string]any{
			"created_with": "date-bound-test",
			"description":  "bound",
			"duration":     1800,
			"project_id":   projectID,
			"start":        entryStart.Format(time.RFC3339),
			"stop":         entryStart.Add(30 * time.Minute).Format(time.RFC3339),
			"workspace_id": workspaceID,
		},
		authorization,
	)
	if entry.Code != http.StatusOK {
		t.Fatalf("entry: %d %s", entry.Code, entry.Body.String())
	}

	wsPath := "/reports/api/v3/workspace/" + intToString(workspaceID)
	insightsPath := "/insights/api/v1/workspace/" + intToString(workspaceID)
	cases := []struct {
		name string
		path string
		body map[string]any
	}{
		// buildQuery users
		{"summary start-only", wsPath + "/summary/time_entries", map[string]any{"start_date": "2026-03-23"}},
		{"summary end-only", wsPath + "/summary/time_entries", map[string]any{"end_date": "2026-03-23"}},
		{"weekly start-only", wsPath + "/weekly/time_entries", map[string]any{"start_date": "2026-03-23"}},
		{"weekly end-only", wsPath + "/weekly/time_entries", map[string]any{"end_date": "2026-03-23"}},

		// parseDateRange users
		{"data_trends projects start-only", wsPath + "/data_trends/projects", map[string]any{"start_date": "2026-03-23"}},
		{"data_trends clients start-only", wsPath + "/data_trends/clients", map[string]any{"start_date": "2026-03-23"}},
		{"data_trends users start-only", wsPath + "/data_trends/users", map[string]any{"start_date": "2026-03-23"}},
		{"single project summary start-only", wsPath + "/projects/" + intToString(projectID) + "/summary", map[string]any{"start_date": "2026-03-23"}},
		{"search time_entries start-only", wsPath + "/search/time_entries", map[string]any{"start_date": "2026-03-23"}},
		{"search totals start-only", wsPath + "/search/time_entries/totals", map[string]any{"start_date": "2026-03-23"}},

		// insights/v1 direct-check users
		{"insights data_trends projects start-only", insightsPath + "/data_trends/projects", map[string]any{"start_date": "2026-03-23"}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			resp := performAuthorizedJSONRequest(t, app, http.MethodPost, tc.path, tc.body, authorization)
			if resp.Code == http.StatusBadRequest {
				t.Fatalf("expected non-400 for single-bound payload, got 400 body=%s", resp.Body.String())
			}
		})
	}

	// And neither-bound still 400 for the same three helpers.
	denyCases := []struct {
		name string
		path string
	}{
		{"summary no bounds", wsPath + "/summary/time_entries"},
		{"data_trends projects no bounds", wsPath + "/data_trends/projects"},
		{"insights data_trends projects no bounds", insightsPath + "/data_trends/projects"},
	}
	for _, tc := range denyCases {
		t.Run(tc.name, func(t *testing.T) {
			resp := performAuthorizedJSONRequest(t, app, http.MethodPost, tc.path, map[string]any{}, authorization)
			if resp.Code != http.StatusBadRequest {
				t.Fatalf("expected 400 for empty payload, got %d body=%s", resp.Code, resp.Body.String())
			}
		})
	}
}
