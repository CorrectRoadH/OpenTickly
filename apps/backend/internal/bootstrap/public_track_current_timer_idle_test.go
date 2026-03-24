package bootstrap

import (
	"net/http"
	"testing"
	"time"

	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

// TestCurrentTimerIdleReturns200Null verifies VAL-ENTRY-004:
// When no timer is running, GET /me/time_entries/current succeeds with body null.
// The timer UI treats that exact transport result as the idle state rather
// than as a 404 or generic failure condition.
func TestCurrentTimerIdleReturns200Null(t *testing.T) {
	database := pgtest.Open(t)
	uniqueEmail := uniqueTestEmail("idle-current-timer")

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

	// Register a user - no running timer yet
	register := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    uniqueEmail,
		"fullname": "Idle Timer User",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}

	authorization := basicAuthorization(uniqueEmail, "secret1")

	// Get current time entry - should return 200 with null body when idle
	getCurrentTimeEntry := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/time_entries/current",
		nil,
		authorization,
	)
	if getCurrentTimeEntry.Code != http.StatusOK {
		t.Fatalf("expected current time entry status 200 when idle, got %d body=%s",
			getCurrentTimeEntry.Code, getCurrentTimeEntry.Body.String())
	}

	// Body should be literal null, not empty object or 404
	// The HTTP response may include a trailing newline
	body := getCurrentTimeEntry.Body.String()
	if body != "null" && body != "null\n" {
		t.Fatalf("expected idle current timer body to be literal null, got %q", body)
	}

	// Now create a running time entry
	var registerBody struct {
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &registerBody)
	workspaceID := *registerBody.CurrentWorkspaceID
	start := time.Now().UTC().Add(-1 * time.Hour).Truncate(time.Second)

	createRunningEntry := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/time_entries",
		map[string]any{
			"created_with": "idle-current-timer-test",
			"description":  "Running timer test",
			"duration":     -1,
			"start":        start.Format(time.RFC3339),
			"workspace_id": workspaceID,
		},
		authorization,
	)
	if createRunningEntry.Code != http.StatusOK {
		t.Fatalf("expected running entry create status 200, got %d body=%s",
			createRunningEntry.Code, createRunningEntry.Body.String())
	}

	// Current time entry should now return the running entry (not null)
	getCurrentWithRunning := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/time_entries/current",
		nil,
		authorization,
	)
	if getCurrentWithRunning.Code != http.StatusOK {
		t.Fatalf("expected current time entry status 200 when running, got %d body=%s",
			getCurrentWithRunning.Code, getCurrentWithRunning.Body.String())
	}
	bodyWithRunning := getCurrentWithRunning.Body.String()
	if bodyWithRunning == "null" {
		t.Fatalf("expected current timer to return running entry, got null")
	}

	// Stop the running entry
	var runningEntryBody map[string]any
	mustDecodeJSON(t, createRunningEntry.Body.Bytes(), &runningEntryBody)
	runningTimeEntryID := int64(runningEntryBody["id"].(float64))

	stopEntry := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPatch,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/time_entries/"+intToString(runningTimeEntryID)+"/stop",
		nil,
		authorization,
	)
	if stopEntry.Code != http.StatusOK {
		t.Fatalf("expected stop entry status 200, got %d body=%s",
			stopEntry.Code, stopEntry.Body.String())
	}

	// After stopping, current time entry should return to idle (null)
	getCurrentAfterStop := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/time_entries/current",
		nil,
		authorization,
	)
	if getCurrentAfterStop.Code != http.StatusOK {
		t.Fatalf("expected current time entry status 200 after stop, got %d body=%s",
			getCurrentAfterStop.Code, getCurrentAfterStop.Body.String())
	}
	bodyAfterStop := getCurrentAfterStop.Body.String()
	// The HTTP response may include a trailing newline
	if bodyAfterStop != "null" && bodyAfterStop != "null\n" {
		t.Fatalf("expected idle current timer body to be literal null after stopping, got %q", bodyAfterStop)
	}
}
