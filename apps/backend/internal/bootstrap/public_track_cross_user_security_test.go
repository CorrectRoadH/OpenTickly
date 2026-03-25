package bootstrap

import (
	"context"
	"net/http"
	"testing"
	"time"

	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

// TestSameWorkspaceAttackerCannotReadVictimCurrentTimerViaHTTP verifies VAL-SEC-TRACK-001:
// An attacker-authenticated read surface cannot reveal another user's current timer
// in the same workspace. This test proves the security boundary at the HTTP transport
// layer by calling GET /api/v9/me/time_entries/current with attacker credentials.
func TestSameWorkspaceAttackerCannotReadVictimCurrentTimerViaHTTP(t *testing.T) {
	database := pgtest.Open(t)
	attackerEmail := uniqueTestEmail("attacker-timer")
	victimEmail := uniqueTestEmail("victim-timer")

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

	// Register attacker user
	attackerRegister := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    attackerEmail,
		"fullname": "Attacker User",
		"password": "secret1",
	}, "")
	if attackerRegister.Code != http.StatusCreated {
		t.Fatalf("expected attacker register status 201, got %d body=%s", attackerRegister.Code, attackerRegister.Body.String())
	}
	var attackerBody struct {
		User struct {
			ID int64 `json:"id"`
		} `json:"user"`
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, attackerRegister.Body.Bytes(), &attackerBody)
	if attackerBody.CurrentWorkspaceID == nil {
		t.Fatalf("expected attacker workspace id, got %#v", attackerBody)
	}
	workspaceID := *attackerBody.CurrentWorkspaceID

	// Register victim user
	victimRegister := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    victimEmail,
		"fullname": "Victim User",
		"password": "secret1",
	}, "")
	if victimRegister.Code != http.StatusCreated {
		t.Fatalf("expected victim register status 201, got %d body=%s", victimRegister.Code, victimRegister.Body.String())
	}
	var victimBody struct {
		User struct {
			ID int64 `json:"id"`
		} `json:"user"`
	}
	mustDecodeJSON(t, victimRegister.Body.Bytes(), &victimBody)

	// Add victim to attacker's workspace via direct DB insert (same workspace membership)
	// Both users are now in the same workspace
	_, err = database.Pool.Exec(
		context.Background(),
		`INSERT INTO membership_workspace_members (workspace_id, user_id, email, full_name, role, state, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		workspaceID,
		victimBody.User.ID,
		victimEmail,
		"Victim User",
		"member",
		"joined",
		attackerBody.User.ID,
	)
	if err != nil {
		t.Fatalf("add victim to workspace: %v", err)
	}

	attackerAuth := basicAuthorization(attackerEmail, "secret1")
	victimAuth := basicAuthorization(victimEmail, "secret1")

	// Victim creates a running timer
	victimStart := time.Now().UTC().Add(-1 * time.Hour).Truncate(time.Second)
	victimCreateEntry := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/time_entries",
		map[string]any{
			"created_with": "cross-user-security-test",
			"description":  "Victim's secret running timer",
			"duration":     -1,
			"start":        victimStart.Format(time.RFC3339),
			"workspace_id": workspaceID,
		},
		victimAuth,
	)
	if victimCreateEntry.Code != http.StatusOK {
		t.Fatalf("victim create running timer: got %d body=%s", victimCreateEntry.Code, victimCreateEntry.Body.String())
	}
	var victimEntry map[string]any
	mustDecodeJSON(t, victimCreateEntry.Body.Bytes(), &victimEntry)
	victimEntryID := int64(victimEntry["id"].(float64))

	// VAL-SEC-TRACK-001: Verify victim can see their own current timer via HTTP
	victimCurrent := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/time_entries/current",
		nil,
		victimAuth,
	)
	if victimCurrent.Code != http.StatusOK {
		t.Fatalf("victim get current timer: got %d body=%s", victimCurrent.Code, victimCurrent.Body.String())
	}
	victimCurrentBody := victimCurrent.Body.String()
	if victimCurrentBody == "null" || victimCurrentBody == "null\n" {
		t.Fatalf("victim should see their own running timer, got null")
	}

	// VAL-SEC-TRACK-001 core assertion: attacker calls GET /api/v9/me/time_entries/current
	// and must NOT see victim's running timer. The response should be null (idle state).
	attackerCurrent := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/time_entries/current",
		nil,
		attackerAuth,
	)
	if attackerCurrent.Code != http.StatusOK {
		t.Fatalf("attacker get current timer status: got %d body=%s", attackerCurrent.Code, attackerCurrent.Body.String())
	}
	attackerCurrentBody := attackerCurrent.Body.String()
	// Attacker should see null (no running timer for attacker)
	if attackerCurrentBody != "null" && attackerCurrentBody != "null\n" {
		t.Fatalf("VAL-SEC-TRACK-001: attacker HTTP GET /me/time_entries/current returned non-null body %q; attacker must NOT see victim's current timer", attackerCurrentBody)
	}

	// Also verify via direct entry ID that attacker cannot read victim's entry by ID
	// GET /api/v9/me/time_entries/:id should return 404 for victim's entry
	attackerGetVictimEntry := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/time_entries/"+intToString(victimEntryID),
		nil,
		attackerAuth,
	)
	if attackerGetVictimEntry.Code != http.StatusNotFound {
		t.Fatalf("VAL-SEC-TRACK-001: attacker GET /me/time_entries/%d returned %d, expected 404; attacker must NOT be able to read victim's entry by ID", victimEntryID, attackerGetVictimEntry.Code)
	}

	// Prove victim's timer is still accessible to victim (not mutated/deleted)
	victimCurrentAfter := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/time_entries/current",
		nil,
		victimAuth,
	)
	if victimCurrentAfter.Code != http.StatusOK {
		t.Fatalf("victim get current timer after security check: got %d", victimCurrentAfter.Code)
	}
	victimCurrentAfterBody := victimCurrentAfter.Body.String()
	if victimCurrentAfterBody == "null" || victimCurrentAfterBody == "null\n" {
		t.Fatalf("victim's running timer should still be accessible after security check")
	}
}

// TestSameWorkspaceAttackerCannotReadVictimTimeEntryHistoryViaHTTP verifies VAL-SEC-TRACK-002:
// An attacker-authenticated read surface cannot reveal another user's time-entry history
// in the same workspace. This test proves the security boundary at the HTTP transport
// layer by calling GET /api/v9/me/time_entries with attacker credentials.
func TestSameWorkspaceAttackerCannotReadVictimTimeEntryHistoryViaHTTP(t *testing.T) {
	database := pgtest.Open(t)
	attackerEmail := uniqueTestEmail("attacker-history")
	victimEmail := uniqueTestEmail("victim-history")

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

	// Register attacker user
	attackerRegister := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    attackerEmail,
		"fullname": "Attacker History",
		"password": "secret1",
	}, "")
	if attackerRegister.Code != http.StatusCreated {
		t.Fatalf("expected attacker register status 201, got %d body=%s", attackerRegister.Code, attackerRegister.Body.String())
	}
	var attackerBody struct {
		User struct {
			ID int64 `json:"id"`
		} `json:"user"`
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, attackerRegister.Body.Bytes(), &attackerBody)
	if attackerBody.CurrentWorkspaceID == nil {
		t.Fatalf("expected attacker workspace id, got %#v", attackerBody)
	}
	workspaceID := *attackerBody.CurrentWorkspaceID

	// Register victim user
	victimRegister := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    victimEmail,
		"fullname": "Victim History",
		"password": "secret1",
	}, "")
	if victimRegister.Code != http.StatusCreated {
		t.Fatalf("expected victim register status 201, got %d body=%s", victimRegister.Code, victimRegister.Body.String())
	}
	var victimBody struct {
		User struct {
			ID int64 `json:"id"`
		} `json:"user"`
	}
	mustDecodeJSON(t, victimRegister.Body.Bytes(), &victimBody)

	// Add victim to attacker's workspace via direct DB insert (same workspace membership)
	_, err = database.Pool.Exec(
		context.Background(),
		`INSERT INTO membership_workspace_members (workspace_id, user_id, email, full_name, role, state, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		workspaceID,
		victimBody.User.ID,
		victimEmail,
		"Victim History",
		"member",
		"joined",
		attackerBody.User.ID,
	)
	if err != nil {
		t.Fatalf("add victim to workspace: %v", err)
	}

	attackerAuth := basicAuthorization(attackerEmail, "secret1")
	victimAuth := basicAuthorization(victimEmail, "secret1")

	// Victim creates multiple time entries
	startDate := "2026-03-23"

	victimEntry1Start := time.Date(2026, 3, 23, 10, 0, 0, 0, time.UTC)
	victimEntry1Stop := time.Date(2026, 3, 23, 11, 30, 0, 0, time.UTC)
	victimCreateEntry1 := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/time_entries",
		map[string]any{
			"created_with": "cross-user-security-test",
			"description":  "Victim's first secret entry",
			"duration":     5400,
			"start":        victimEntry1Start.Format(time.RFC3339),
			"stop":         victimEntry1Stop.Format(time.RFC3339),
			"workspace_id": workspaceID,
		},
		victimAuth,
	)
	if victimCreateEntry1.Code != http.StatusOK {
		t.Fatalf("victim create entry 1: got %d body=%s", victimCreateEntry1.Code, victimCreateEntry1.Body.String())
	}
	var victimEntry1 map[string]any
	mustDecodeJSON(t, victimCreateEntry1.Body.Bytes(), &victimEntry1)
	victimEntry1ID := int64(victimEntry1["id"].(float64))

	victimEntry2Start := time.Date(2026, 3, 23, 14, 0, 0, 0, time.UTC)
	victimEntry2Stop := time.Date(2026, 3, 23, 16, 0, 0, 0, time.UTC)
	victimCreateEntry2 := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/time_entries",
		map[string]any{
			"created_with": "cross-user-security-test",
			"description":  "Victim's second secret entry",
			"duration":     7200,
			"start":        victimEntry2Start.Format(time.RFC3339),
			"stop":         victimEntry2Stop.Format(time.RFC3339),
			"workspace_id": workspaceID,
		},
		victimAuth,
	)
	if victimCreateEntry2.Code != http.StatusOK {
		t.Fatalf("victim create entry 2: got %d body=%s", victimCreateEntry2.Code, victimCreateEntry2.Body.String())
	}
	var victimEntry2 map[string]any
	mustDecodeJSON(t, victimCreateEntry2.Body.Bytes(), &victimEntry2)
	victimEntry2ID := int64(victimEntry2["id"].(float64))

	// Attacker creates their own entry to prove they can still read their own data
	attackerEntryStart := time.Date(2026, 3, 23, 9, 0, 0, 0, time.UTC)
	attackerEntryStop := time.Date(2026, 3, 23, 10, 0, 0, 0, time.UTC)
	attackerCreateEntry := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/time_entries",
		map[string]any{
			"created_with": "cross-user-security-test",
			"description":  "Attacker's own entry",
			"duration":     3600,
			"start":        attackerEntryStart.Format(time.RFC3339),
			"stop":         attackerEntryStop.Format(time.RFC3339),
			"workspace_id": workspaceID,
		},
		attackerAuth,
	)
	if attackerCreateEntry.Code != http.StatusOK {
		t.Fatalf("attacker create own entry: got %d body=%s", attackerCreateEntry.Code, attackerCreateEntry.Body.String())
	}
	var attackerEntry map[string]any
	mustDecodeJSON(t, attackerCreateEntry.Body.Bytes(), &attackerEntry)
	attackerEntryID := int64(attackerEntry["id"].(float64))

	// VAL-SEC-TRACK-002: Verify victim can see their own entries via HTTP
	victimList := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/time_entries?start_date="+startDate+"&end_date="+startDate,
		nil,
		victimAuth,
	)
	if victimList.Code != http.StatusOK {
		t.Fatalf("victim list entries: got %d body=%s", victimList.Code, victimList.Body.String())
	}
	var victimEntries []map[string]any
	mustDecodeJSON(t, victimList.Body.Bytes(), &victimEntries)
	if len(victimEntries) != 2 {
		t.Fatalf("victim should see 2 entries, got %d", len(victimEntries))
	}

	// VAL-SEC-TRACK-002 core assertion: attacker's GET /api/v9/me/time_entries
	// must NOT include victim's entries. Attacker should only see their own entry.
	attackerList := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/time_entries?start_date="+startDate+"&end_date="+startDate,
		nil,
		attackerAuth,
	)
	if attackerList.Code != http.StatusOK {
		t.Fatalf("attacker list entries: got %d body=%s", attackerList.Code, attackerList.Body.String())
	}
	var attackerEntries []map[string]any
	mustDecodeJSON(t, attackerList.Body.Bytes(), &attackerEntries)

	// Attacker should see exactly 1 entry (their own)
	if len(attackerEntries) != 1 {
		t.Fatalf("VAL-SEC-TRACK-002: attacker should see exactly 1 entry (their own), got %d entries", len(attackerEntries))
	}
	if int64(attackerEntries[0]["id"].(float64)) != attackerEntryID {
		t.Fatalf("VAL-SEC-TRACK-002: attacker's only entry should be their own (id=%d), got id=%d", attackerEntryID, int64(attackerEntries[0]["id"].(float64)))
	}

	// Verify victim's entries are NOT in attacker's list
	for _, e := range attackerEntries {
		entryID := int64(e["id"].(float64))
		if entryID == victimEntry1ID || entryID == victimEntry2ID {
			t.Fatalf("VAL-SEC-TRACK-002: attacker's history includes victim's entry (id=%d); cross-user history read is not blocked", entryID)
		}
	}

	// Also verify via direct entry ID that attacker cannot read victim's entries
	attackerGetVictimEntry1 := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/time_entries/"+intToString(victimEntry1ID),
		nil,
		attackerAuth,
	)
	if attackerGetVictimEntry1.Code != http.StatusNotFound {
		t.Fatalf("VAL-SEC-TRACK-002: attacker GET /me/time_entries/%d returned %d, expected 404; attacker must NOT read victim's entry by ID", victimEntry1ID, attackerGetVictimEntry1.Code)
	}

	attackerGetVictimEntry2 := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/time_entries/"+intToString(victimEntry2ID),
		nil,
		attackerAuth,
	)
	if attackerGetVictimEntry2.Code != http.StatusNotFound {
		t.Fatalf("VAL-SEC-TRACK-002: attacker GET /me/time_entries/%d returned %d, expected 404; attacker must NOT read victim's entry by ID", victimEntry2ID, attackerGetVictimEntry2.Code)
	}

	// Prove victim's entries are still accessible to victim (not mutated/deleted)
	victimListAfter := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/time_entries?start_date="+startDate+"&end_date="+startDate,
		nil,
		victimAuth,
	)
	if victimListAfter.Code != http.StatusOK {
		t.Fatalf("victim list entries after security check: got %d", victimListAfter.Code)
	}
	var victimEntriesAfter []map[string]any
	mustDecodeJSON(t, victimListAfter.Body.Bytes(), &victimEntriesAfter)
	if len(victimEntriesAfter) != 2 {
		t.Fatalf("victim should still see 2 entries after security check, got %d", len(victimEntriesAfter))
	}
}

// TestSameWorkspaceOwnerCanStillReadOwnTimerViaHTTP proves the "owner can still read their own"
// requirement from the feature expectedBehavior. In the same seeded scenario where victim has data,
// attacker must not see victim's data BUT attacker must still be able to read their own timer.
func TestSameWorkspaceOwnerCanStillReadOwnTimerViaHTTP(t *testing.T) {
	database := pgtest.Open(t)
	attackerEmail := uniqueTestEmail("attacker-own-read")
	victimEmail := uniqueTestEmail("victim-own-read")

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

	// Register attacker user
	attackerRegister := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    attackerEmail,
		"fullname": "Attacker Own Read",
		"password": "secret1",
	}, "")
	if attackerRegister.Code != http.StatusCreated {
		t.Fatalf("expected attacker register status 201, got %d body=%s", attackerRegister.Code, attackerRegister.Body.String())
	}
	var attackerBody struct {
		User struct {
			ID int64 `json:"id"`
		} `json:"user"`
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, attackerRegister.Body.Bytes(), &attackerBody)
	if attackerBody.CurrentWorkspaceID == nil {
		t.Fatalf("expected attacker workspace id, got %#v", attackerBody)
	}
	workspaceID := *attackerBody.CurrentWorkspaceID

	// Register victim user
	victimRegister := performJSONRequest(t, app, http.MethodPost, "/web/v1/auth/register", map[string]any{
		"email":    victimEmail,
		"fullname": "Victim Own Read",
		"password": "secret1",
	}, "")
	if victimRegister.Code != http.StatusCreated {
		t.Fatalf("expected victim register status 201, got %d body=%s", victimRegister.Code, victimRegister.Body.String())
	}
	var victimBody struct {
		User struct {
			ID int64 `json:"id"`
		} `json:"user"`
	}
	mustDecodeJSON(t, victimRegister.Body.Bytes(), &victimBody)

	// Add victim to attacker's workspace
	_, err = database.Pool.Exec(
		context.Background(),
		`INSERT INTO membership_workspace_members (workspace_id, user_id, email, full_name, role, state, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		workspaceID,
		victimBody.User.ID,
		victimEmail,
		"Victim Own Read",
		"member",
		"joined",
		attackerBody.User.ID,
	)
	if err != nil {
		t.Fatalf("add victim to workspace: %v", err)
	}

	attackerAuth := basicAuthorization(attackerEmail, "secret1")
	victimAuth := basicAuthorization(victimEmail, "secret1")

	// Victim creates a running timer
	victimStart := time.Now().UTC().Add(-1 * time.Hour).Truncate(time.Second)
	victimCreateTimer := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/time_entries",
		map[string]any{
			"created_with": "cross-user-security-test",
			"description":  "Victim's running timer",
			"duration":     -1,
			"start":        victimStart.Format(time.RFC3339),
			"workspace_id": workspaceID,
		},
		victimAuth,
	)
	if victimCreateTimer.Code != http.StatusOK {
		t.Fatalf("victim create running timer: got %d body=%s", victimCreateTimer.Code, victimCreateTimer.Body.String())
	}

	// Attacker creates their own running timer
	attackerStart := time.Now().UTC().Add(-30 * time.Minute).Truncate(time.Second)
	attackerCreateTimer := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/time_entries",
		map[string]any{
			"created_with": "cross-user-security-test",
			"description":  "Attacker's own running timer",
			"duration":     -1,
			"start":        attackerStart.Format(time.RFC3339),
			"workspace_id": workspaceID,
		},
		attackerAuth,
	)
	if attackerCreateTimer.Code != http.StatusOK {
		t.Fatalf("attacker create running timer: got %d body=%s", attackerCreateTimer.Code, attackerCreateTimer.Body.String())
	}
	var attackerTimer map[string]any
	mustDecodeJSON(t, attackerCreateTimer.Body.Bytes(), &attackerTimer)
	attackerTimerID := int64(attackerTimer["id"].(float64))

	// Attacker must see their own current timer (not victim's)
	attackerCurrent := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/time_entries/current",
		nil,
		attackerAuth,
	)
	if attackerCurrent.Code != http.StatusOK {
		t.Fatalf("attacker get current timer: got %d body=%s", attackerCurrent.Code, attackerCurrent.Body.String())
	}
	attackerCurrentBody := attackerCurrent.Body.String()
	if attackerCurrentBody == "null" || attackerCurrentBody == "null\n" {
		t.Fatalf("attacker should see their own running timer, got null")
	}
	var attackerCurrentEntry map[string]any
	mustDecodeJSON(t, attackerCurrent.Body.Bytes(), &attackerCurrentEntry)
	if int64(attackerCurrentEntry["id"].(float64)) != attackerTimerID {
		t.Fatalf("attacker should see their own timer ID %d, got ID %d", attackerTimerID, int64(attackerCurrentEntry["id"].(float64)))
	}

	// Attacker creates a stopped entry
	start := time.Date(2026, 3, 24, 8, 0, 0, 0, time.UTC)
	stop := time.Date(2026, 3, 24, 9, 0, 0, 0, time.UTC)
	attackerCreateEntry := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/time_entries",
		map[string]any{
			"created_with": "cross-user-security-test",
			"description":  "Attacker's stopped entry",
			"duration":     3600,
			"start":        start.Format(time.RFC3339),
			"stop":         stop.Format(time.RFC3339),
			"workspace_id": workspaceID,
		},
		attackerAuth,
	)
	if attackerCreateEntry.Code != http.StatusOK {
		t.Fatalf("attacker create stopped entry: got %d body=%s", attackerCreateEntry.Code, attackerCreateEntry.Body.String())
	}
	var attackerEntry map[string]any
	mustDecodeJSON(t, attackerCreateEntry.Body.Bytes(), &attackerEntry)
	attackerEntryID := int64(attackerEntry["id"].(float64))

	// Attacker must see their own history entries
	// Note: running entries don't appear in the date-filtered list because they have no stop date.
	// We verify running entries separately via the /current endpoint.
	startDate := "2026-03-24"
	attackerList := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/time_entries?start_date="+startDate+"&end_date="+startDate,
		nil,
		attackerAuth,
	)
	if attackerList.Code != http.StatusOK {
		t.Fatalf("attacker list entries: got %d body=%s", attackerList.Code, attackerList.Body.String())
	}
	var attackerEntries []map[string]any
	mustDecodeJSON(t, attackerList.Body.Bytes(), &attackerEntries)
	// Attacker should see exactly 1 entry (the stopped one) in the date-filtered list.
	// Running entries appear via /current, not in the date-filtered history list.
	if len(attackerEntries) != 1 {
		t.Fatalf("attacker should see 1 stopped entry in history list, got %d", len(attackerEntries))
	}

	// Verify the stopped entry is attacker's own
	if int64(attackerEntries[0]["id"].(float64)) != attackerEntryID {
		t.Fatalf("attacker's history entry should be their stopped entry (id=%d), got id=%d", attackerEntryID, int64(attackerEntries[0]["id"].(float64)))
	}

	// Verify via direct readback that attacker can read their own stopped entry
	attackerGetOwnEntry := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/time_entries/"+intToString(attackerEntryID),
		nil,
		attackerAuth,
	)
	if attackerGetOwnEntry.Code != http.StatusOK {
		t.Fatalf("attacker direct readback of own entry: got %d body=%s", attackerGetOwnEntry.Code, attackerGetOwnEntry.Body.String())
	}
	var attackerOwnEntry map[string]any
	mustDecodeJSON(t, attackerGetOwnEntry.Body.Bytes(), &attackerOwnEntry)
	if int64(attackerOwnEntry["id"].(float64)) != attackerEntryID {
		t.Fatalf("attacker direct readback should return own entry ID %d, got %d", attackerEntryID, int64(attackerOwnEntry["id"].(float64)))
	}

	// Prove victim's data is still intact
	victimCurrent := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/time_entries/current",
		nil,
		victimAuth,
	)
	if victimCurrent.Code != http.StatusOK {
		t.Fatalf("victim current timer after security checks: got %d", victimCurrent.Code)
	}
	victimCurrentBody := victimCurrent.Body.String()
	if victimCurrentBody == "null" || victimCurrentBody == "null\n" {
		t.Fatalf("victim's running timer should still be accessible, got null")
	}
}
