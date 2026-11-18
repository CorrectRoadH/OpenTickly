package bootstrap

import (
	"net/http"
	"os"
	"testing"
	"time"

	catalog "opentoggl/backend/apps/backend/internal/catalog/application"
	reportsapi "opentoggl/backend/apps/backend/internal/http/generated/publicreports"
	trackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"

	openapitypes "github.com/oapi-codegen/runtime/types"
	"github.com/samber/lo"
)

func TestPublicBillableRatesFeedProjectAndReports(t *testing.T) {
	db := pgtest.Open(t)
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://127.0.0.1:6379/15"
	}
	app, err := NewApp(Config{
		ServiceName: "billable-rates-test",
		Server:      ServerConfig{ListenAddress: ":0"},
		Database:    DatabaseConfig{PrimaryDSN: db.ConnString()},
		Redis:       RedisConfig{Address: redisURL},
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(app.Platform.Database.Close)
	email := uniqueTestEmail("billable-rates")
	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register",
		webapi.RegisterRequest{Email: openapitypes.Email(email), Fullname: lo.ToPtr("Rates Owner"), Password: "secret1"}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("register: %d %s", register.Code, register.Body.String())
	}
	var session struct {
		WorkspaceID int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &session)
	auth := basicAuthorization(email, "secret1")
	workspace := "/api/v9/workspaces/" + intToString(session.WorkspaceID)
	request := func(method, path string, body any, status int) []byte {
		t.Helper()
		response := performAuthorizedJSONRequest(t, app, method, path, body, auth)
		if response.Code != status {
			t.Fatalf("%s %s: %d %s", method, path, response.Code, response.Body.String())
		}
		return response.Body.Bytes()
	}

	request(http.MethodPut, workspace, trackapi.WorkspacePayload{DefaultCurrency: lo.ToPtr("EUR")}, http.StatusOK)
	project := request(http.MethodPost, workspace+"/projects",
		trackapi.ProjectPayload{Name: lo.ToPtr("Rated project"), Billable: lo.ToPtr(true)}, http.StatusOK)
	var projectBody trackapi.GithubComTogglTogglApiInternalModelsProject
	mustDecodeJSON(t, project, &projectBody)
	projectID := int64(lo.FromPtr(projectBody.Id))
	projectPath := workspace + "/projects/" + intToString(projectID)
	assertProject := func(body []byte, rate float32, currency string) {
		t.Helper()
		var result trackapi.GithubComTogglTogglApiInternalModelsProject
		mustDecodeJSON(t, body, &result)
		if result.Rate == nil || *result.Rate != rate || lo.FromPtr(result.Currency) != currency || result.RateLastUpdated == nil {
			t.Fatalf("project rate, currency, or updated date missing: %s", body)
		}
	}
	assertProject(request(http.MethodPut, projectPath, trackapi.ProjectPayload{
		Rate: lo.ToPtr(float32(9200)), Currency: lo.ToPtr("EUR"),
	}, http.StatusOK), 9200, "EUR")
	assertProject(request(http.MethodGet, projectPath, nil, http.StatusOK), 9200, "EUR")

	start := time.Now().UTC().Truncate(24 * time.Hour).Add(-10 * 24 * time.Hour)
	createRate := func(level string, id int64, amount float32, effective time.Time, mode *trackapi.RatesCreationRequestMode) {
		t.Helper()
		request(http.MethodPost, workspace+"/rates", trackapi.RatesCreationRequest{
			Level: trackapi.RatesCreationRequestLevel(level), LevelId: int(id), Amount: &amount,
			Type: lo.ToPtr("billable_rates"), Start: lo.ToPtr(effective.Format(time.RFC3339)),
			Mode: mode,
		}, http.StatusCreated)
	}
	createRate("project", projectID, 10000, start.Add(-time.Hour), lo.ToPtr(trackapi.RatesCreationRequestMode("override-all")))
	assertProject(request(http.MethodGet, projectPath, nil, http.StatusOK), 10000, "EUR")

	var memberID, userID, taskID int64
	if err := db.Pool.QueryRow(t.Context(), "select id, user_id from membership_workspace_members where workspace_id = $1", session.WorkspaceID).Scan(&memberID, &userID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Pool.Exec(t.Context(), "insert into catalog_project_users (project_id, user_id) values ($1, $2) on conflict do nothing", projectID, userID); err != nil {
		t.Fatal(err)
	}
	if err := db.Pool.QueryRow(t.Context(), "insert into catalog_tasks (workspace_id, project_id, name) values ($1, $2, 'Rated task') returning id", session.WorkspaceID, projectID).Scan(&taskID); err != nil {
		t.Fatal(err)
	}
	createRate("workspace", session.WorkspaceID, 2000, start, nil)
	createRate("workspace_user", memberID, 4000, start.Add(time.Hour), nil)
	createRate("project_user", catalog.EncodeProjectUserID(projectID, userID), 12000, start.Add(3*time.Hour), nil)
	createRate("task", taskID, 15000, start.Add(4*time.Hour), nil)
	for i := range 5 {
		entryStart := start.Add(time.Duration(i) * time.Hour)
		var projectIDArg, taskIDArg *int64
		if i >= 2 {
			projectIDArg = &projectID
		}
		if i == 4 {
			taskIDArg = &taskID
		}
		if _, err := db.Pool.Exec(t.Context(), `
			insert into tracking_time_entries (workspace_id, user_id, project_id, task_id, billable, start_time, stop_time, duration_seconds)
			values ($1, $2, $3, $4, true, $5, $6, 3600)`,
			session.WorkspaceID, userID, projectIDArg, taskIDArg, entryStart, entryStart.Add(time.Hour),
		); err != nil {
			t.Fatal(err)
		}
	}

	date := start.Format("2006-01-02")
	reportPath := "/reports/api/v3/workspace/" + intToString(session.WorkspaceID)
	query := reportsapi.BasePost{StartDate: &date, EndDate: &date}
	const wantCents = 43000
	for _, endpoint := range []string{"/summary/time_entries", "/weekly/time_entries"} {
		body := request(http.MethodPost, reportPath+endpoint, query, http.StatusOK)
		var result reportsapi.SavedWeeklyReportData
		if endpoint == "/summary/time_entries" {
			var summary reportsapi.SavedSummaryReportData
			mustDecodeJSON(t, body, &summary)
			result.Totals = summary.Totals
		} else {
			mustDecodeJSON(t, body, &result)
			for _, row := range lo.FromPtr(result.Report) {
				if lo.FromPtr(row.Currency) != "EUR" || row.HourlyRateInCents != nil {
					t.Errorf("expected EUR and a mixed hourly rate: %+v", row)
				}
			}
		}
		if result.Totals == nil || lo.FromPtr(result.Totals.BillableAmountInCents) != wantCents {
			t.Errorf("%s: expected %d cents, got %s", endpoint, wantCents, body)
		}
	}
	checkProfitability := func(want int) {
		t.Helper()
		body := request(http.MethodPost, reportPath+"/profitability/projects", reportsapi.DtoProjectProfitability{
			Currency: "USD", StartDate: &date, EndDate: &date, ProjectIds: lo.ToPtr([]int{int(projectID)}),
		}, http.StatusOK)
		var result reportsapi.ProjectsReport
		mustDecodeJSON(t, body, &result)
		rows := lo.FromPtr(result.Table)
		if len(rows) != 1 || lo.FromPtr(rows[0].Earnings) != want || lo.FromPtr(result.Currency) != "EUR" {
			t.Errorf("expected earnings of %d cents in EUR: %s", want, body)
		}
	}
	checkProfitability(37000)
	request(http.MethodPost, workspace+"/rates", trackapi.RatesCreationRequest{
		Level: "project", LevelId: int(projectID), Amount: lo.ToPtr(float32(20000)),
		Type: lo.ToPtr("billable_rates"), Mode: lo.ToPtr(trackapi.RatesCreationRequestMode("override-all")),
	}, http.StatusCreated)
	checkProfitability(47000)
	totalsBody := request(http.MethodPost, reportPath+"/search/time_entries/totals", query, http.StatusOK)
	var totals reportsapi.TotalsReportData
	mustDecodeJSON(t, totalsBody, &totals)
	if lo.FromPtr(totals.BillableAmountInCents) != 53000 {
		t.Errorf("totals did not match effective rates: %s", totalsBody)
	}
	for _, endpoint := range []string{"projects", "clients", "users"} {
		body := request(http.MethodPost, reportPath+"/data_trends/"+endpoint, reportsapi.BaseDataTrendsPost{
			StartDate: &date, EndDate: &date, Currency: lo.ToPtr("USD"),
		}, http.StatusOK)
		type earningsRow struct {
			Earnings int `json:"earnings"`
		}
		var trend struct {
			Currency string `json:"currency"`
			Graph    struct {
				Data []struct {
					Projects []earningsRow `json:"projects"`
					Clients  []earningsRow `json:"clients"`
					Users    []earningsRow `json:"users"`
				} `json:"data"`
			} `json:"graph"`
		}
		mustDecodeJSON(t, body, &trend)
		earnings := 0
		for _, day := range trend.Graph.Data {
			for _, group := range [][]earningsRow{day.Projects, day.Clients, day.Users} {
				for _, row := range group {
					earnings += row.Earnings
				}
			}
		}
		if earnings != 53000 || trend.Currency != "EUR" {
			t.Errorf("%s trend had wrong earnings or currency: %s", endpoint, body)
		}
	}

	newProject := request(http.MethodPost, workspace+"/projects", trackapi.ProjectPayload{
		Name: lo.ToPtr("Project with initial rate"), Rate: lo.ToPtr(float32(12300)), Currency: lo.ToPtr("EUR"),
	}, http.StatusOK)
	assertProject(newProject, 12300, "EUR")
	mustDecodeJSON(t, newProject, &projectBody)
	newProjectID := lo.FromPtr(projectBody.Id)
	memberPath := workspace + "/project_users"
	member := request(http.MethodPost, memberPath, trackapi.UserPostPayload{
		ProjectId: &newProjectID, UserId: lo.ToPtr(int(userID)), Manager: lo.ToPtr(true),
		Rate: lo.ToPtr(float32(8800)), LaborCost: lo.ToPtr(float32(2500)),
	}, http.StatusOK)
	assertMember := func(body []byte, rate, cost float32) {
		t.Helper()
		var result trackapi.ModelsProjectUser
		mustDecodeJSON(t, body, &result)
		if lo.FromPtr(result.Rate) != rate || lo.FromPtr(result.LaborCost) != cost ||
			result.RateLastUpdated == nil || result.LaborCostLastUpdated == nil || !lo.FromPtr(result.Manager) {
			t.Errorf("project member rate or cost not reflected: %s", body)
		}
	}
	assertMember(member, 8800, 2500)
	memberIDPath := memberPath + "/" + intToString(catalog.EncodeProjectUserID(int64(newProjectID), userID))
	assertMember(request(http.MethodPut, memberIDPath, trackapi.UserPutPayload{
		Rate: lo.ToPtr(float32(9400)), LaborCost: lo.ToPtr(float32(3100)),
	}, http.StatusOK), 9400, 3100)

	readerEmail := uniqueTestEmail("rate-reader")
	reader := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register",
		webapi.RegisterRequest{Email: openapitypes.Email(readerEmail), Fullname: lo.ToPtr("Rate Reader"), Password: "secret1"}, "")
	if reader.Code != http.StatusCreated {
		t.Fatalf("register reader: %d %s", reader.Code, reader.Body.String())
	}
	if _, err := db.Pool.Exec(t.Context(), `
		insert into membership_workspace_members (workspace_id, user_id, email, role, state)
		select $1, id, email, 'member', 'joined' from identity_users where email = $2
	`, session.WorkspaceID, readerEmail); err != nil {
		t.Fatal(err)
	}
	readerAuth := basicAuthorization(readerEmail, "secret1")
	visible := performAuthorizedJSONRequest(t, app, http.MethodGet,
		memberPath+"?project_ids="+intToString(int64(newProjectID)), nil, readerAuth)
	var visibleMembers []trackapi.ModelsProjectUser
	mustDecodeJSON(t, visible.Body.Bytes(), &visibleMembers)
	if visible.Code != http.StatusOK || len(visibleMembers) != 1 ||
		lo.FromPtr(visibleMembers[0].Rate) != 9400 || visibleMembers[0].LaborCost != nil {
		t.Errorf("workspace member should see the billable rate without labor cost: %d %s", visible.Code, visible.Body.String())
	}
	denied := performAuthorizedJSONRequest(t, app, http.MethodPut, memberIDPath,
		trackapi.UserPutPayload{LaborCost: lo.ToPtr(float32(1))}, readerAuth)
	if denied.Code != http.StatusForbidden {
		t.Errorf("workspace member could modify labor cost: %d %s", denied.Code, denied.Body.String())
	}

	settingsBody := request(http.MethodPut, workspace, trackapi.WorkspacePayload{
		DefaultCurrency: lo.ToPtr("GBP"), DefaultHourlyRate: lo.ToPtr(float32(0)),
	}, http.StatusOK)
	var settings trackapi.GithubComTogglTogglApiInternalModelsWorkspace
	mustDecodeJSON(t, settingsBody, &settings)
	if lo.FromPtr(settings.DefaultCurrency) != "GBP" || lo.FromPtr(settings.DefaultHourlyRate) != 0 {
		t.Errorf("workspace billing settings not saved: %s", settingsBody)
	}
	var activeWorkspaceRates int
	if err := db.Pool.QueryRow(t.Context(), `
		select count(*) from catalog_rates where workspace_id = $1 and level = 'workspace'
			and type = 'billable_rates' and (end_at is null or end_at > now())`,
		session.WorkspaceID).Scan(&activeWorkspaceRates); err != nil || activeWorkspaceRates != 0 {
		t.Fatalf("workspace rate remained active after disabling: %d, %v", activeWorkspaceRates, err)
	}

}
