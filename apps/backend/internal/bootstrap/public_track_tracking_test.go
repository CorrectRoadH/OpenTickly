package bootstrap

import (
	"context"
	"net/http"
	"testing"
	"time"

	"opentoggl/backend/apps/backend/internal/testsupport/pgtest"
)

func TestPublicTrackRoutesServeTrackingSurface(t *testing.T) {
	database := pgtest.Open(t)
	uniqueEmail := uniqueTestEmail("tracking-surface")
	baseStart := time.Now().UTC().Add(-2 * time.Hour).Truncate(time.Second)
	secondStart := baseStart.Add(2 * time.Hour)
	secondStop := secondStart.Add(1 * time.Hour)
	startDate := baseStart.Format("2006-01-02")
	endDate := baseStart.Add(24 * time.Hour).Format("2006-01-02")
	goalEndDate := baseStart.Add(7 * 24 * time.Hour).Format("2006-01-02")

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
		"fullname": "Tracking Surface",
		"password": "secret1",
	}, "")
	if register.Code != http.StatusCreated {
		t.Fatalf("expected register status 201, got %d body=%s", register.Code, register.Body.String())
	}

	var registerBody struct {
		User struct {
			ID int64 `json:"id"`
		} `json:"user"`
		CurrentWorkspaceID *int64 `json:"current_workspace_id"`
	}
	mustDecodeJSON(t, register.Body.Bytes(), &registerBody)
	if registerBody.CurrentWorkspaceID == nil {
		t.Fatalf("expected current workspace id, got %#v", registerBody)
	}

	workspaceID := *registerBody.CurrentWorkspaceID
	authorization := basicAuthorization(uniqueEmail, "secret1")

	createClient := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/clients",
		map[string]any{"name": "Tracking Client"},
		authorization,
	)
	if createClient.Code != http.StatusOK {
		t.Fatalf("expected client create status 200, got %d body=%s", createClient.Code, createClient.Body.String())
	}
	var clientBody map[string]any
	mustDecodeJSON(t, createClient.Body.Bytes(), &clientBody)
	clientID := int64(clientBody["id"].(float64))

	createTag := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/tags",
		map[string]any{"name": "deep-work"},
		authorization,
	)
	if createTag.Code != http.StatusOK {
		t.Fatalf("expected tag create status 200, got %d body=%s", createTag.Code, createTag.Body.String())
	}
	var tagBody map[string]any
	mustDecodeJSON(t, createTag.Body.Bytes(), &tagBody)
	tagID := int64(tagBody["id"].(float64))

	createProject := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects",
		map[string]any{"name": "Tracking Project", "client_id": clientID},
		authorization,
	)
	if createProject.Code != http.StatusOK {
		t.Fatalf("expected project create status 200, got %d body=%s", createProject.Code, createProject.Body.String())
	}
	var projectBody map[string]any
	mustDecodeJSON(t, createProject.Body.Bytes(), &projectBody)
	projectID := int64(projectBody["id"].(float64))

	createTask := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/projects/"+intToString(projectID)+"/tasks",
		map[string]any{"name": "Tracking Task"},
		authorization,
	)
	if createTask.Code != http.StatusOK {
		t.Fatalf("expected task create status 200, got %d body=%s", createTask.Code, createTask.Body.String())
	}
	var taskBody map[string]any
	mustDecodeJSON(t, createTask.Body.Bytes(), &taskBody)
	taskID := int64(taskBody["id"].(float64))

	createRunningTimeEntry := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/time_entries",
		map[string]any{
			"created_with": "public-track-test",
			"description":  "Initial focus block",
			"duration":     -1,
			"project_id":   projectID,
			"start":        baseStart.Format(time.RFC3339),
			"tag_ids":      []int64{tagID},
			"task_id":      taskID,
			"workspace_id": workspaceID,
		},
		authorization,
	)
	if createRunningTimeEntry.Code != http.StatusOK {
		t.Fatalf("expected time entry create status 200, got %d body=%s", createRunningTimeEntry.Code, createRunningTimeEntry.Body.String())
	}
	var runningEntryBody map[string]any
	mustDecodeJSON(t, createRunningTimeEntry.Body.Bytes(), &runningEntryBody)
	runningTimeEntryID := int64(runningEntryBody["id"].(float64))

	getCurrentTimeEntry := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/time_entries/current",
		nil,
		authorization,
	)
	if getCurrentTimeEntry.Code != http.StatusOK {
		t.Fatalf("expected current time entry status 200, got %d body=%s", getCurrentTimeEntry.Code, getCurrentTimeEntry.Body.String())
	}

	stopTimeEntry := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPatch,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/time_entries/"+intToString(runningTimeEntryID)+"/stop",
		nil,
		authorization,
	)
	if stopTimeEntry.Code != http.StatusOK {
		t.Fatalf("expected stop time entry status 200, got %d body=%s", stopTimeEntry.Code, stopTimeEntry.Body.String())
	}

	createSecondTimeEntry := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/time_entries",
		map[string]any{
			"created_with": "public-track-test",
			"description":  "Review notes",
			"duration":     3600,
			"project_id":   projectID,
			"start":        secondStart.Format(time.RFC3339),
			"stop":         secondStop.Format(time.RFC3339),
			"tag_ids":      []int64{tagID},
			"task_id":      taskID,
			"workspace_id": workspaceID,
		},
		authorization,
	)
	if createSecondTimeEntry.Code != http.StatusOK {
		t.Fatalf("expected second time entry create status 200, got %d body=%s", createSecondTimeEntry.Code, createSecondTimeEntry.Body.String())
	}
	var secondTimeEntryBody map[string]any
	mustDecodeJSON(t, createSecondTimeEntry.Body.Bytes(), &secondTimeEntryBody)
	secondTimeEntryID := int64(secondTimeEntryBody["id"].(float64))

	listTimeEntries := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/time_entries?start_date="+startDate+"&end_date="+endDate,
		nil,
		authorization,
	)
	if listTimeEntries.Code != http.StatusOK {
		t.Fatalf("expected time entries list status 200, got %d body=%s", listTimeEntries.Code, listTimeEntries.Body.String())
	}
	var timeEntries []map[string]any
	mustDecodeJSON(t, listTimeEntries.Body.Bytes(), &timeEntries)
	if len(timeEntries) != 2 {
		t.Fatalf("expected two time entries, got %#v", timeEntries)
	}

	timeEntryChecklist := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/time_entries/checklist",
		nil,
		authorization,
	)
	if timeEntryChecklist.Code != http.StatusOK {
		t.Fatalf("expected time entry checklist status 200, got %d body=%s", timeEntryChecklist.Code, timeEntryChecklist.Body.String())
	}

	getTimeEntryByID := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/time_entries/"+intToString(secondTimeEntryID),
		nil,
		authorization,
	)
	if getTimeEntryByID.Code != http.StatusOK {
		t.Fatalf("expected time entry by id status 200, got %d body=%s", getTimeEntryByID.Code, getTimeEntryByID.Body.String())
	}

	updateTimeEntry := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPut,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/time_entries/"+intToString(secondTimeEntryID),
		map[string]any{
			"billable":    true,
			"description": "Review notes updated",
			"project_id":  projectID,
			"tag_ids":     []int64{tagID},
			"task_id":     taskID,
		},
		authorization,
	)
	if updateTimeEntry.Code != http.StatusOK {
		t.Fatalf("expected time entry update status 200, got %d body=%s", updateTimeEntry.Code, updateTimeEntry.Body.String())
	}

	patchTimeEntries := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPatch,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/time_entries/"+intToString(runningTimeEntryID)+","+intToString(secondTimeEntryID),
		[]map[string]any{
			{
				"op":    "replace",
				"path":  "/description",
				"value": "Patched description",
			},
		},
		authorization,
	)
	if patchTimeEntries.Code != http.StatusOK {
		t.Fatalf("expected patch time entries status 200, got %d body=%s", patchTimeEntries.Code, patchTimeEntries.Body.String())
	}

	createFavorite := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/favorites",
		map[string]any{
			"description":  "Favorite focus template",
			"project_id":   projectID,
			"rank":         1,
			"tag_ids":      []int64{tagID},
			"task_id":      taskID,
			"workspace_id": workspaceID,
		},
		authorization,
	)
	if createFavorite.Code != http.StatusOK {
		t.Fatalf("expected favorite create status 200, got %d body=%s", createFavorite.Code, createFavorite.Body.String())
	}
	var favoriteBody map[string]any
	mustDecodeJSON(t, createFavorite.Body.Bytes(), &favoriteBody)
	favoriteID := int64(favoriteBody["favorite_id"].(float64))

	getFavorites := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/favorites",
		nil,
		authorization,
	)
	if getFavorites.Code != http.StatusOK {
		t.Fatalf("expected favorites status 200, got %d body=%s", getFavorites.Code, getFavorites.Body.String())
	}

	updateFavorite := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPut,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/favorites",
		map[string]any{
			"description": "Favorite focus template updated",
			"favorite_id": favoriteID,
			"rank":        2,
		},
		authorization,
	)
	if updateFavorite.Code != http.StatusOK {
		t.Fatalf("expected favorite update status 200, got %d body=%s", updateFavorite.Code, updateFavorite.Body.String())
	}

	favoriteSuggestions := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/favorites/suggestions",
		nil,
		authorization,
	)
	if favoriteSuggestions.Code != http.StatusOK {
		t.Fatalf("expected favorite suggestions status 200, got %d body=%s", favoriteSuggestions.Code, favoriteSuggestions.Body.String())
	}

	createGoal := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/goals",
		map[string]any{
			"comparison":     "gte",
			"end_date":       goalEndDate,
			"icon":           "target",
			"name":           "Ship tracker",
			"project_ids":    []int64{projectID},
			"start_date":     startDate,
			"tag_ids":        []int64{tagID},
			"target_seconds": 7200,
			"task_ids":       []int64{taskID},
			"user_id":        registerBody.User.ID,
		},
		authorization,
	)
	if createGoal.Code != http.StatusOK {
		t.Fatalf("expected goal create status 200, got %d body=%s", createGoal.Code, createGoal.Body.String())
	}
	var goalBody map[string]any
	mustDecodeJSON(t, createGoal.Body.Bytes(), &goalBody)
	goalID := int64(goalBody["goal_id"].(float64))

	listGoals := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/goals?page=1&per_page=20",
		nil,
		authorization,
	)
	if listGoals.Code != http.StatusOK {
		t.Fatalf("expected goals list status 200, got %d body=%s", listGoals.Code, listGoals.Body.String())
	}

	getGoal := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/goals/"+intToString(goalID),
		nil,
		authorization,
	)
	if getGoal.Code != http.StatusOK {
		t.Fatalf("expected goal detail status 200, got %d body=%s", getGoal.Code, getGoal.Body.String())
	}

	updateGoal := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPut,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/goals/"+intToString(goalID),
		map[string]any{
			"name":           "Ship tracker updated",
			"target_seconds": 10800,
		},
		authorization,
	)
	if updateGoal.Code != http.StatusOK {
		t.Fatalf("expected goal update status 200, got %d body=%s", updateGoal.Code, updateGoal.Body.String())
	}

	syncServerGoals := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/sync-server/me/goals?active=true",
		nil,
		authorization,
	)
	if syncServerGoals.Code != http.StatusOK {
		t.Fatalf("expected sync server goals status 200, got %d body=%s", syncServerGoals.Code, syncServerGoals.Body.String())
	}

	createReminder := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/track_reminders",
		map[string]any{
			"email_reminder_enabled": true,
			"frequency":              1,
			"threshold":              6,
			"user_ids":               []int64{registerBody.User.ID},
		},
		authorization,
	)
	if createReminder.Code != http.StatusOK {
		t.Fatalf("expected reminder create status 200, got %d body=%s", createReminder.Code, createReminder.Body.String())
	}
	var reminderBody map[string]any
	mustDecodeJSON(t, createReminder.Body.Bytes(), &reminderBody)
	reminderID := int64(reminderBody["reminder_id"].(float64))

	getWorkspaceReminders := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/track_reminders",
		nil,
		authorization,
	)
	if getWorkspaceReminders.Code != http.StatusOK {
		t.Fatalf("expected workspace reminders status 200, got %d body=%s", getWorkspaceReminders.Code, getWorkspaceReminders.Body.String())
	}

	getMeReminders := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/me/track_reminders",
		nil,
		authorization,
	)
	if getMeReminders.Code != http.StatusOK {
		t.Fatalf("expected me reminders status 200, got %d body=%s", getMeReminders.Code, getMeReminders.Body.String())
	}

	updateReminder := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodPut,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/track_reminders/"+intToString(reminderID),
		map[string]any{
			"email_reminder_enabled": false,
			"frequency":              7,
			"threshold":              4,
			"user_ids":               []int64{registerBody.User.ID},
		},
		authorization,
	)
	if updateReminder.Code != http.StatusOK {
		t.Fatalf("expected reminder update status 200, got %d body=%s", updateReminder.Code, updateReminder.Body.String())
	}

	createExpense := performAuthorizedMultipartRequest(
		t,
		app,
		http.MethodPost,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/expenses/upload",
		nil,
		"file",
		"receipt.txt",
		[]byte("receipt"),
		authorization,
	)
	if createExpense.Code != http.StatusOK {
		t.Fatalf("expected expense create status 200, got %d body=%s", createExpense.Code, createExpense.Body.String())
	}

	getExpenses := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodGet,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/expenses",
		nil,
		authorization,
	)
	if getExpenses.Code != http.StatusOK {
		t.Fatalf("expected expenses status 200, got %d body=%s", getExpenses.Code, getExpenses.Body.String())
	}

	deleteReminder := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodDelete,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/track_reminders/"+intToString(reminderID),
		nil,
		authorization,
	)
	if deleteReminder.Code != http.StatusOK {
		t.Fatalf("expected reminder delete status 200, got %d body=%s", deleteReminder.Code, deleteReminder.Body.String())
	}

	deleteFavorite := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodDelete,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/favorites/"+intToString(favoriteID),
		nil,
		authorization,
	)
	if deleteFavorite.Code != http.StatusOK {
		t.Fatalf("expected favorite delete status 200, got %d body=%s", deleteFavorite.Code, deleteFavorite.Body.String())
	}

	deleteGoal := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodDelete,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/goals/"+intToString(goalID),
		nil,
		authorization,
	)
	if deleteGoal.Code != http.StatusOK {
		t.Fatalf("expected goal delete status 200, got %d body=%s", deleteGoal.Code, deleteGoal.Body.String())
	}

	deleteTimeEntry := performAuthorizedJSONRequest(
		t,
		app,
		http.MethodDelete,
		"/api/v9/workspaces/"+intToString(workspaceID)+"/time_entries/"+intToString(secondTimeEntryID),
		nil,
		authorization,
	)
	if deleteTimeEntry.Code != http.StatusOK {
		t.Fatalf("expected time entry delete status 200, got %d body=%s", deleteTimeEntry.Code, deleteTimeEntry.Body.String())
	}

	var deletedTimeEntryCount int
	if err := database.Pool.QueryRow(
		context.Background(),
		"select count(*) from tracking_time_entries where id = $1 and deleted_at is not null",
		secondTimeEntryID,
	).Scan(&deletedTimeEntryCount); err != nil {
		t.Fatalf("count deleted time entry: %v", err)
	}
	if deletedTimeEntryCount != 1 {
		t.Fatalf("expected deleted time entry row to remain tombstoned, got %d", deletedTimeEntryCount)
	}
}
