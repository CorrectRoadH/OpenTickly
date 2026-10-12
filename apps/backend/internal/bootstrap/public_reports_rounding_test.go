package bootstrap

import (
	"encoding/csv"
	"net/http"
	"strconv"
	"strings"
	"testing"
	"time"

	openapitypes "github.com/oapi-codegen/runtime/types"
	"github.com/samber/lo"
	reportsapi "opentoggl/backend/apps/backend/internal/http/generated/publicreports"
	trackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestReportRoundingUsesWorkspaceDefaultsAndRequestOverrides(t *testing.T) {
	db := pgtest.Open(t)
	app, err := NewApp(Config{ServiceName: "rounding-test", Server: ServerConfig{ListenAddress: ":0"}, Database: DatabaseConfig{PrimaryDSN: db.ConnString()}, Redis: RedisConfig{Address: "redis://127.0.0.1:6379/15"}})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(app.Platform.Database.Close)
	email := uniqueTestEmail("rounding")
	registered := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", webapi.RegisterRequest{Email: openapitypes.Email(email), Fullname: lo.ToPtr("Rounding"), Password: "secret1"}, "")
	if registered.Code != http.StatusCreated {
		t.Fatalf("register: %d %s", registered.Code, registered.Body.String())
	}
	var session struct {
		WorkspaceID int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, registered.Body.Bytes(), &session)
	auth := basicAuthorization(email, "secret1")
	workspacePath := "/api/v9/workspaces/" + intToString(session.WorkspaceID)
	updated := performAuthorizedJSONRequest(t, app, http.MethodPut, workspacePath, trackapi.WorkspacePayload{Rounding: lo.ToPtr(1), RoundingMinutes: lo.ToPtr(5)}, auth)
	if updated.Code != http.StatusOK {
		t.Fatalf("settings: %d %s", updated.Code, updated.Body.String())
	}
	start := time.Date(2026, 10, 5, 10, 0, 0, 0, time.UTC)
	for _, duration := range []int{61, 239} {
		entry := performAuthorizedJSONRequest(t, app, http.MethodPost, workspacePath+"/time_entries", trackapi.GithubComTogglTogglApiInternalModelsTimeEntry{Description: lo.ToPtr("Rounded entry"), Duration: lo.ToPtr(duration), Start: lo.ToPtr(start.Format(time.RFC3339)), Stop: lo.ToPtr(start.Add(time.Duration(duration) * time.Second).Format(time.RFC3339)), Billable: lo.ToPtr(true)}, auth)
		if entry.Code != http.StatusOK {
			t.Fatalf("entry: %d %s", entry.Code, entry.Body.String())
		}
	}
	for _, tc := range []struct {
		name          string
		mode, minutes *int
		want          int
	}{
		{"workspace defaults", nil, nil, 600},
		{"disabled", nil, lo.ToPtr(0), 300},
		{"nearest", lo.ToPtr(0), lo.ToPtr(5), 300},
		{"down", lo.ToPtr(-1), lo.ToPtr(5), 0},
		{"override interval", lo.ToPtr(1), lo.ToPtr(15), 1800},
	} {
		t.Run(tc.name, func(t *testing.T) {
			request := reportsapi.BasePost{StartDate: lo.ToPtr("2026-10-05"), EndDate: lo.ToPtr("2026-10-05"), Rounding: tc.mode, RoundingMinutes: tc.minutes}
			for _, endpoint := range []string{"weekly/time_entries", "summary/time_entries", "search/time_entries/totals"} {
				response := performAuthorizedJSONRequest(t, app, http.MethodPost, "/reports/api/v3/workspace/"+intToString(session.WorkspaceID)+"/"+endpoint, request, auth)
				if response.Code != http.StatusOK {
					t.Fatalf("%s: %d %s", endpoint, response.Code, response.Body.String())
				}
				var payload struct {
					Totals struct {
						Seconds int `json:"seconds"`
					} `json:"totals"`
					Seconds int `json:"seconds"`
				}
				mustDecodeJSON(t, response.Body.Bytes(), &payload)
				got := payload.Totals.Seconds
				if endpoint == "search/time_entries/totals" {
					got = payload.Seconds
				}
				if got != tc.want {
					t.Errorf("%s: seconds %d, want %d", endpoint, got, tc.want)
				}
			}
			basePath := "/reports/api/v3/workspace/" + intToString(session.WorkspaceID) + "/"
			detail := performAuthorizedJSONRequest(t, app, http.MethodPost, basePath+"search/time_entries", request, auth)
			if detail.Code != http.StatusOK {
				t.Fatalf("detail: %d %s", detail.Code, detail.Body.String())
			}
			var entries []struct {
				Duration int    `json:"dur"`
				Start    string `json:"start"`
				Stop     string `json:"stop"`
			}
			mustDecodeJSON(t, detail.Body.Bytes(), &entries)
			total := 0
			for _, entry := range entries {
				total += entry.Duration
			}
			if total != tc.want*1000 {
				t.Errorf("detail milliseconds %d, want %d", total, tc.want*1000)
			}
			for _, endpoint := range []string{"weekly/time_entries.csv", "summary/time_entries.csv", "search/time_entries.csv"} {
				response := performAuthorizedJSONRequest(t, app, http.MethodPost, basePath+endpoint, request, auth)
				if response.Code != http.StatusOK {
					t.Fatalf("csv %s: %d %s", endpoint, response.Code, response.Body.String())
				}
				records, err := csv.NewReader(strings.NewReader(response.Body.String())).ReadAll()
				if err != nil {
					t.Fatal(err)
				}
				column := 3
				if endpoint == "summary/time_entries.csv" {
					column = 1
				}
				if endpoint == "search/time_entries.csv" {
					column = 4
				}
				sum := 0
				for _, row := range records[1:] {
					seconds, err := strconv.Atoi(row[column])
					if err != nil {
						t.Fatal(err)
					}
					sum += seconds
				}
				if sum != tc.want {
					t.Errorf("%s seconds %d want %d", endpoint, sum, tc.want)
				}
			}

		})
	}
	basePath := "/reports/api/v3/workspace/" + intToString(session.WorkspaceID) + "/"
	for _, endpoint := range []string{"weekly/time_entries.csv", "summary/time_entries.csv", "search/time_entries.csv"} {
		response := performAuthorizedJSONRequest(t, app, http.MethodPost, basePath+endpoint, reportsapi.BasePost{}, "")
		if response.Code != http.StatusUnauthorized && response.Code != http.StatusForbidden {
			t.Errorf("unauthenticated %s: %d", endpoint, response.Code)
		}
	}
	response := performAuthorizedJSONRequest(t, app, http.MethodPost, basePath+"weekly/time_entries", reportsapi.BasePost{RoundingMinutes: lo.ToPtr(-1)}, auth)
	if response.Code != http.StatusBadRequest {
		t.Errorf("negative interval: %d", response.Code)
	}
	for _, mode := range []int{-2, 2} {
		response := performAuthorizedJSONRequest(t, app, http.MethodPost, "/reports/api/v3/workspace/"+intToString(session.WorkspaceID)+"/weekly/time_entries", reportsapi.BasePost{Rounding: lo.ToPtr(mode)}, auth)
		if response.Code != http.StatusBadRequest {
			t.Errorf("invalid mode %d: %d", mode, response.Code)
		}
	}
	raw := performAuthorizedJSONRequest(t, app, http.MethodGet, "/api/v9/me/time_entries?start_date=2026-10-05&end_date=2026-10-06", nil, auth)
	var originals []trackapi.GithubComTogglTogglApiInternalModelsTimeEntry
	mustDecodeJSON(t, raw.Body.Bytes(), &originals)
	total := 0
	for _, entry := range originals {
		total += lo.FromPtr(entry.Duration)
	}
	if len(originals) != 2 || total != 300 {
		t.Errorf("stored entries changed: count=%d seconds=%d", len(originals), total)
	}

}
