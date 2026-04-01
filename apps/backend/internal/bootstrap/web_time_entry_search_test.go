package bootstrap

import (
	"fmt"
	"net/http"
	"testing"
	"time"

	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestSearchWorkspaceTimeEntries(t *testing.T) {
	database := pgtest.Open(t)
	uniqueEmail := uniqueTestEmail("te-search")

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

	// Register and get session + workspace
	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    uniqueEmail,
		"fullname": "Search Test User",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register 201, got %d body=%s", register.Code, register.Body.String())
	}
	sessionCookie := register.Header().Get("Set-Cookie")
	authorization := basicAuthorization(uniqueEmail, "secret1")

	var registerBody struct {
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &registerBody)
	if registerBody.CurrentWorkspaceID == nil {
		t.Fatalf("expected current_workspace_id")
	}
	workspaceID := *registerBody.CurrentWorkspaceID

	// Create 12 time entries with different descriptions
	baseStart := time.Now().UTC().Add(-48 * time.Hour).Truncate(time.Second)
	descriptions := []string{
		"Stand-up meeting",
		"Code review session",
		"Deploy staging build",
		"Write unit tests",
		"Fix login bug",
		"Database migration",
		"API documentation",
		"Sprint planning",
		"Design review",
		"Infrastructure monitoring",
		"Performance profiling",
		"特殊的搜索目标条目",
	}

	for i, desc := range descriptions {
		start := baseStart.Add(time.Duration(i) * time.Hour)
		stop := start.Add(30 * time.Minute)
		create := performAuthorizedJSONRequest(t, app, http.MethodPost,
			fmt.Sprintf("/api/v9/workspaces/%d/time_entries", workspaceID),
			map[string]any{
				"description":  desc,
				"start":        start.Format(time.RFC3339),
				"stop":         stop.Format(time.RFC3339),
				"duration":     1800,
				"created_with": "go-test",
				"workspace_id": workspaceID,
			},
			authorization,
		)
		if create.Code != http.StatusOK {
			t.Fatalf("create entry %d (%s) failed: %d body=%s", i, desc, create.Code, create.Body.String())
		}
	}

	t.Run("returns matching entries by description substring", func(t *testing.T) {
		search := performJSONRequest(t, app, http.MethodGet,
			fmt.Sprintf("/web/v1/workspaces/%d/time-entries/search?query=%s", workspaceID, "搜索目标"),
			nil, sessionCookie,
		)
		if search.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", search.Code, search.Body.String())
		}

		var result struct {
			Entries []struct {
				ID          int64   `json:"id"`
				Description string  `json:"description"`
				ProjectName *string `json:"project_name"`
			} `json:"entries"`
		}
		mustDecodeJSON(t, search.Body.Bytes(), &result)

		if len(result.Entries) != 1 {
			t.Fatalf("expected 1 entry, got %d: %+v", len(result.Entries), result.Entries)
		}
		if result.Entries[0].Description != "特殊的搜索目标条目" {
			t.Errorf("expected description '特殊的搜索目标条目', got %q", result.Entries[0].Description)
		}
	})

	t.Run("returns empty when no match", func(t *testing.T) {
		search := performJSONRequest(t, app, http.MethodGet,
			fmt.Sprintf("/web/v1/workspaces/%d/time-entries/search?query=nonexistent-xyz", workspaceID),
			nil, sessionCookie,
		)
		if search.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", search.Code, search.Body.String())
		}

		var result struct {
			Entries []struct{} `json:"entries"`
		}
		mustDecodeJSON(t, search.Body.Bytes(), &result)

		if len(result.Entries) != 0 {
			t.Fatalf("expected 0 entries, got %d", len(result.Entries))
		}
	})

	t.Run("case-insensitive match", func(t *testing.T) {
		search := performJSONRequest(t, app, http.MethodGet,
			fmt.Sprintf("/web/v1/workspaces/%d/time-entries/search?query=sprint+planning", workspaceID),
			nil, sessionCookie,
		)
		if search.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", search.Code, search.Body.String())
		}

		var result struct {
			Entries []struct {
				Description string `json:"description"`
			} `json:"entries"`
		}
		mustDecodeJSON(t, search.Body.Bytes(), &result)

		if len(result.Entries) != 1 {
			t.Fatalf("expected 1 entry, got %d", len(result.Entries))
		}
		if result.Entries[0].Description != "Sprint planning" {
			t.Errorf("expected 'Sprint planning', got %q", result.Entries[0].Description)
		}
	})

	t.Run("returns 400 when query is empty", func(t *testing.T) {
		search := performJSONRequest(t, app, http.MethodGet,
			fmt.Sprintf("/web/v1/workspaces/%d/time-entries/search?query=", workspaceID),
			nil, sessionCookie,
		)
		if search.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", search.Code)
		}
	})
}
