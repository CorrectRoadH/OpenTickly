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
}
