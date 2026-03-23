package bootstrap

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"

	"github.com/labstack/echo/v4"
)

func (runtime *webRuntime) getPublicTrackTimeEntries(ctx echo.Context) error {
	workspaceID, user, err := runtime.requirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}

	filter := trackingapplication.ListTimeEntriesFilter{UserID: user.ID}
	if since, ok := queryInt64(ctx, "since"); ok {
		timeValue := time.Unix(since, 0).UTC()
		filter.Since = &timeValue
	}
	if before := strings.TrimSpace(ctx.QueryParam("before")); before != "" {
		value, parseErr := parseTrackDateTime(before, true)
		if parseErr != nil {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		filter.Before = &value
	}
	if startDate := strings.TrimSpace(ctx.QueryParam("start_date")); startDate != "" {
		value, parseErr := parseTrackDateTime(startDate, false)
		if parseErr != nil {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		filter.StartDate = &value
	}
	if endDate := strings.TrimSpace(ctx.QueryParam("end_date")); endDate != "" {
		value, parseErr := parseTrackDateTime(endDate, true)
		if parseErr != nil {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		filter.EndDate = &value
	}

	entries, err := runtime.trackingApp.ListTimeEntries(ctx.Request().Context(), workspaceID, filter)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}

	response := make([]publictrackapi.GithubComTogglTogglApiInternalModelsTimeEntry, 0, len(entries))
	for _, entry := range entries {
		response = append(response, timeEntryViewToAPI(entry))
	}
	return ctx.JSON(http.StatusOK, response)
}

func (runtime *webRuntime) getPublicTrackTimeEntriesChecklist(ctx echo.Context) error {
	workspaceID, user, err := runtime.requirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	entries, err := runtime.trackingApp.ListTimeEntries(ctx.Request().Context(), workspaceID, trackingapplication.ListTimeEntriesFilter{
		UserID: user.ID,
	})
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	created := len(entries) > 0
	return ctx.JSON(http.StatusOK, publictrackapi.ModelsTimeEntryChecklist{
		TimeEntriesCountCheck:   boolPointer(created),
		TimeEntriesCreatedCheck: boolPointer(created),
	})
}

func (runtime *webRuntime) getPublicTrackCurrentTimeEntry(ctx echo.Context) error {
	_, user, err := runtime.requirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	entry, err := runtime.trackingApp.GetCurrentTimeEntry(ctx.Request().Context(), user.ID)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, timeEntryViewToAPI(entry))
}

func (runtime *webRuntime) getPublicTrackTimeEntryByID(ctx echo.Context) error {
	workspaceID, user, err := runtime.requirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	timeEntryID, ok := parsePathID(ctx, "time_entry_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	entry, err := runtime.trackingApp.GetTimeEntry(ctx.Request().Context(), workspaceID, user.ID, timeEntryID)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, timeEntryViewToAPI(entry))
}

func (runtime *webRuntime) postPublicTrackTimeEntry(ctx echo.Context) error {
	workspaceID, user, err := runtime.requirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	var payload publictrackapi.TimeentryPayload
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	start, err := parseRequiredTrackRFC3339(payload.Start)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	stop, err := parseOptionalTrackRFC3339(payload.Stop)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	entry, err := runtime.trackingApp.CreateTimeEntry(ctx.Request().Context(), trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      user.ID,
		Billable:    boolValue(payload.Billable),
		Description: stringValue(payload.Description),
		Start:       start,
		Stop:        stop,
		Duration:    int64PointerToIntPointer(payload.Duration),
		CreatedWith: stringValue(payload.CreatedWith),
		ProjectID:   firstTrackIntPointerAsInt64(payload.ProjectId, payload.Pid),
		TaskID:      firstTrackIntPointerAsInt64(payload.TaskId, payload.Tid),
		TagIDs:      int64sFromTrackInts(payload.TagIds),
	})
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, timeEntryViewToAPI(entry))
}

func (runtime *webRuntime) putPublicTrackTimeEntry(ctx echo.Context) error {
	workspaceID, user, err := runtime.requirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	timeEntryID, ok := parsePathID(ctx, "time_entry_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	var payload publictrackapi.TimeentryPayload
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	start, err := parseOptionalTrackRFC3339(payload.Start)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	stop, err := parseOptionalTrackRFC3339(payload.Stop)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	entry, err := runtime.trackingApp.UpdateTimeEntry(ctx.Request().Context(), trackingapplication.UpdateTimeEntryCommand{
		WorkspaceID: workspaceID,
		TimeEntryID: timeEntryID,
		UserID:      user.ID,
		Billable:    payload.Billable,
		Description: payload.Description,
		Start:       start,
		Stop:        stop,
		Duration:    int64PointerToIntPointer(payload.Duration),
		ProjectID:   firstTrackIntPointerAsInt64(payload.ProjectId, payload.Pid),
		TaskID:      firstTrackIntPointerAsInt64(payload.TaskId, payload.Tid),
		TagIDs:      int64sFromTrackInts(payload.TagIds),
		ReplaceTags: payload.TagIds != nil,
	})
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, timeEntryViewToAPI(entry))
}

func (runtime *webRuntime) patchPublicTrackTimeEntries(ctx echo.Context) error {
	workspaceID, user, err := runtime.requirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	rawIDs := strings.TrimSpace(ctx.Param("time_entry_ids"))
	timeEntryIDs, parseErr := parseCSVInt64s(rawIDs)
	if parseErr != nil || len(timeEntryIDs) == 0 {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	var payload []publictrackapi.TimeentryPatchInput
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	patches := make([]trackingapplication.TimeEntryPatch, 0, len(payload))
	for _, patch := range payload {
		patches = append(patches, trackingapplication.TimeEntryPatch{
			Op:    stringValue(patch.Op),
			Path:  stringValue(patch.Path),
			Value: interfaceValue(patch.Value),
		})
	}
	success, err := runtime.trackingApp.PatchTimeEntries(ctx.Request().Context(), workspaceID, user.ID, timeEntryIDs, patches)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	successIDs := make([]int, 0, len(success))
	for _, id := range success {
		successIDs = append(successIDs, int(id))
	}
	return ctx.JSON(http.StatusOK, publictrackapi.TimeentryPatchOutput{
		Success: &successIDs,
	})
}

func (runtime *webRuntime) stopPublicTrackTimeEntry(ctx echo.Context) error {
	workspaceID, user, err := runtime.requirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	timeEntryID, ok := parsePathID(ctx, "time_entry_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	entry, err := runtime.trackingApp.StopTimeEntry(ctx.Request().Context(), workspaceID, user.ID, timeEntryID)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, timeEntryViewToAPI(entry))
}

func (runtime *webRuntime) deletePublicTrackTimeEntry(ctx echo.Context) error {
	workspaceID, user, err := runtime.requirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	timeEntryID, ok := parsePathID(ctx, "time_entry_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := runtime.trackingApp.DeleteTimeEntry(ctx.Request().Context(), workspaceID, user.ID, timeEntryID); err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, "OK")
}

func (runtime *webRuntime) getPublicTrackFavorites(ctx echo.Context) error {
	workspaceID, user, err := runtime.requirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	favorites, err := runtime.trackingApp.ListFavorites(ctx.Request().Context(), workspaceID, user.ID)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	response := make([]publictrackapi.ModelsFavorite, 0, len(favorites))
	for _, favorite := range favorites {
		response = append(response, favoriteViewToAPI(favorite))
	}
	return ctx.JSON(http.StatusOK, response)
}

func (runtime *webRuntime) postPublicTrackFavorite(ctx echo.Context) error {
	workspaceID, user, err := runtime.requirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	var payload publictrackapi.HandlerfavoritesPayload
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	favorite, err := runtime.trackingApp.UpsertFavorite(ctx.Request().Context(), trackingapplication.UpsertFavoriteCommand{
		WorkspaceID: workspaceID,
		UserID:      user.ID,
		ProjectID:   int64PointerFromTrackIntPointer(payload.ProjectId),
		TaskID:      int64PointerFromTrackIntPointer(payload.TaskId),
		Description: payload.Description,
		Billable:    payload.Billable,
		TagIDs:      int64sFromTrackInts(payload.TagIds),
		ReplaceTags: payload.TagIds != nil,
	})
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, favoriteViewToAPI(favorite))
}

func (runtime *webRuntime) putPublicTrackFavorite(ctx echo.Context) error {
	workspaceID, user, err := runtime.requirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	var payload publictrackapi.FavoritesUpdateFavorite
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	favoriteID := int64PointerFromTrackIntPointer(payload.FavoriteId)
	if favoriteID == nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	favorite, err := runtime.trackingApp.UpsertFavorite(ctx.Request().Context(), trackingapplication.UpsertFavoriteCommand{
		WorkspaceID: workspaceID,
		UserID:      user.ID,
		FavoriteID:  favoriteID,
		ProjectID:   int64PointerFromTrackIntPointer(payload.ProjectId),
		TaskID:      int64PointerFromTrackIntPointer(payload.TaskId),
		Description: payload.Description,
		Billable:    payload.Billable,
		Public:      payload.Public,
		Rank:        payload.Rank,
		TagIDs:      int64sFromTrackInts(payload.TagIds),
		ReplaceTags: payload.TagIds != nil,
	})
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, favoriteViewToAPI(favorite))
}

func (runtime *webRuntime) postPublicTrackFavoriteSuggestions(ctx echo.Context) error {
	return runtime.getPublicTrackFavorites(ctx)
}

func (runtime *webRuntime) deletePublicTrackFavorite(ctx echo.Context) error {
	workspaceID, user, err := runtime.requirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	favoriteID, ok := parsePathID(ctx, "favorite_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := runtime.trackingApp.DeleteFavorite(ctx.Request().Context(), workspaceID, user.ID, favoriteID); err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, "OK")
}

func (runtime *webRuntime) getPublicTrackGoals(ctx echo.Context) error {
	workspaceID, user, err := runtime.requirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	filter := trackingapplication.ListGoalsFilter{
		UserID:  user.ID,
		Page:    queryInt(ctx, "page", 1),
		PerPage: queryInt(ctx, "per_page", 20),
	}
	if active, ok := queryBool(ctx, "active"); ok {
		filter.Active = &active
	}
	goals, err := runtime.trackingApp.ListGoals(ctx.Request().Context(), workspaceID, filter)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	response := make([]publictrackapi.HandlergoalsAPIResponse, 0, len(goals))
	for _, goal := range goals {
		response = append(response, goalViewToAPI(goal))
	}
	return ctx.JSON(http.StatusOK, response)
}

func (runtime *webRuntime) getPublicTrackGoal(ctx echo.Context) error {
	workspaceID, user, err := runtime.requirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	goalID, ok := parsePathID(ctx, "goal_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	goal, err := runtime.trackingApp.GetGoal(ctx.Request().Context(), workspaceID, user.ID, goalID)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, goalViewToAPI(goal))
}

func (runtime *webRuntime) postPublicTrackGoal(ctx echo.Context) error {
	workspaceID, user, err := runtime.requirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	var payload publictrackapi.HandlergoalsCreatePayload
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	startDate, err := parseTrackDate(payload.StartDate)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	endDate, err := parseOptionalTrackDate(payload.EndDate)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	goal, err := runtime.trackingApp.CreateGoal(ctx.Request().Context(), trackingapplication.CreateGoalCommand{
		WorkspaceID:   workspaceID,
		UserID:        int64ValueOr(user.ID, payload.UserId),
		CreatorUserID: user.ID,
		Name:          stringValue(payload.Name),
		Billable:      boolValue(payload.Billable),
		Comparison:    stringValue(payload.Comparison),
		Recurrence:    stringValue(payload.Recurrence),
		Icon:          stringValue(payload.Icon),
		TargetSeconds: intValueOrZero(payload.TargetSeconds),
		StartDate:     startDate,
		EndDate:       endDate,
		ProjectIDs:    int64sFromTrackInts(payload.ProjectIds),
		TaskIDs:       int64sFromTrackInts(payload.TaskIds),
		TagIDs:        int64sFromTrackInts(payload.TagIds),
	})
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, goalViewToAPI(goal))
}

func (runtime *webRuntime) putPublicTrackGoal(ctx echo.Context) error {
	workspaceID, user, err := runtime.requirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	goalID, ok := parsePathID(ctx, "goal_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	var payload publictrackapi.HandlergoalsUpdatePayload
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	endDate, err := parseOptionalTrackDate(payload.EndDate)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	goal, err := runtime.trackingApp.UpdateGoal(ctx.Request().Context(), trackingapplication.UpdateGoalCommand{
		WorkspaceID:   workspaceID,
		GoalID:        goalID,
		UserID:        user.ID,
		Active:        payload.Active,
		Name:          payload.Name,
		Comparison:    payload.Comparison,
		Icon:          payload.Icon,
		TargetSeconds: payload.TargetSeconds,
		EndDate:       endDate,
	})
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, goalViewToAPI(goal))
}

func (runtime *webRuntime) deletePublicTrackGoal(ctx echo.Context) error {
	workspaceID, user, err := runtime.requirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	goalID, ok := parsePathID(ctx, "goal_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := runtime.trackingApp.DeleteGoal(ctx.Request().Context(), workspaceID, user.ID, goalID); err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, "OK")
}

func (runtime *webRuntime) getPublicTrackSyncGoals(ctx echo.Context) error {
	return runtime.getPublicTrackGoals(ctx)
}

func (runtime *webRuntime) getPublicTrackTrackReminders(ctx echo.Context) error {
	workspaceID, _, err := runtime.requirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	reminders, err := runtime.trackingApp.ListReminders(ctx.Request().Context(), workspaceID)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	response := make([]publictrackapi.ModelsTrackReminder, 0, len(reminders))
	for _, reminder := range reminders {
		response = append(response, reminderViewToAPI(reminder))
	}
	return ctx.JSON(http.StatusOK, response)
}

func (runtime *webRuntime) getPublicTrackMeTrackReminders(ctx echo.Context) error {
	return runtime.getPublicTrackTrackReminders(ctx)
}

func (runtime *webRuntime) postPublicTrackTrackReminder(ctx echo.Context) error {
	workspaceID, _, err := runtime.requirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	var payload publictrackapi.RemindersPayload
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	reminder, err := runtime.trackingApp.UpsertReminder(ctx.Request().Context(), trackingapplication.UpsertReminderCommand{
		WorkspaceID:          workspaceID,
		Frequency:            intValueOrZero(payload.Frequency),
		ThresholdHours:       float64Value(payload.Threshold),
		EmailReminderEnabled: boolValue(payload.EmailReminderEnabled),
		SlackReminderEnabled: boolValue(payload.SlackReminderEnabled),
		UserIDs:              int64sFromTrackInts(payload.UserIds),
		GroupIDs:             int64sFromTrackInts(payload.GroupIds),
	})
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, reminderViewToAPI(reminder))
}

func (runtime *webRuntime) putPublicTrackTrackReminder(ctx echo.Context) error {
	workspaceID, _, err := runtime.requirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	reminderID, ok := parsePathID(ctx, "reminder_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	var payload publictrackapi.RemindersPayload
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	reminder, err := runtime.trackingApp.UpsertReminder(ctx.Request().Context(), trackingapplication.UpsertReminderCommand{
		WorkspaceID:          workspaceID,
		ReminderID:           &reminderID,
		Frequency:            intValueOrZero(payload.Frequency),
		ThresholdHours:       float64Value(payload.Threshold),
		EmailReminderEnabled: boolValue(payload.EmailReminderEnabled),
		SlackReminderEnabled: boolValue(payload.SlackReminderEnabled),
		UserIDs:              int64sFromTrackInts(payload.UserIds),
		GroupIDs:             int64sFromTrackInts(payload.GroupIds),
	})
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, reminderViewToAPI(reminder))
}

func (runtime *webRuntime) deletePublicTrackTrackReminder(ctx echo.Context) error {
	workspaceID, _, err := runtime.requirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	reminderID, ok := parsePathID(ctx, "reminder_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := runtime.trackingApp.DeleteReminder(ctx.Request().Context(), workspaceID, reminderID); err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, "OK")
}

func (runtime *webRuntime) getPublicTrackExpenses(ctx echo.Context) error {
	workspaceID, user, err := runtime.requirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	expenses, err := runtime.trackingApp.ListExpenses(ctx.Request().Context(), workspaceID, user.ID)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	response := make([]publictrackapi.ExpensesExpense, 0, len(expenses))
	for _, expense := range expenses {
		response = append(response, expenseViewToAPI(expense))
	}
	return ctx.JSON(http.StatusOK, response)
}

func (runtime *webRuntime) postPublicTrackExpense(ctx echo.Context) error {
	workspaceID, user, err := runtime.requirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	payload, err := bindPublicTrackExpensePayload(ctx)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if payload.DateOfExpense == nil {
		today := time.Now().UTC().Format("2006-01-02")
		payload.DateOfExpense = &today
	}
	dateOfExpense, err := parseTrackDate(payload.DateOfExpense)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	expense, err := runtime.trackingApp.CreateExpense(ctx.Request().Context(), trackingapplication.CreateExpenseCommand{
		WorkspaceID:   workspaceID,
		UserID:        int64ValueOr(user.ID, payload.UserId),
		TimeEntryID:   nil,
		Description:   stringValue(payload.Description),
		Category:      stringValue(payload.Category),
		State:         defaultString(payload.State, "draft"),
		Currency:      defaultString(payload.Currency, "USD"),
		TotalAmount:   intValueOrZero(payload.TotalAmount),
		DateOfExpense: dateOfExpense,
	})
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, expenseViewToAPI(expense))
}

func (runtime *webRuntime) requirePublicTrackTrackingScope(ctx echo.Context) (int64, *identityapplication.UserSnapshot, error) {
	user, err := runtime.requirePublicTrackUser(ctx)
	if err != nil {
		return 0, nil, err
	}
	workspaceID, ok := parseOptionalPathID(ctx, "workspace_id")
	if ok {
		if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
			return 0, nil, err
		}
		return workspaceID, user, nil
	}
	home, err := runtime.requirePublicTrackHome(ctx)
	if err != nil {
		return 0, nil, err
	}
	return home.workspaceID, user, nil
}

func writePublicTrackTrackingError(err error) error {
	switch {
	case errors.Is(err, trackingapplication.ErrRunningTimeEntryExists):
		return echo.NewHTTPError(http.StatusConflict, "Conflict")
	case trackingapplication.IsNotFound(err):
		return echo.NewHTTPError(http.StatusNotFound, "Not Found")
	case errors.Is(err, trackingapplication.ErrInvalidTimeRange),
		errors.Is(err, trackingapplication.ErrInvalidWorkspace):
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
	default:
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}
}

func timeEntryViewToAPI(view trackingapplication.TimeEntryView) publictrackapi.GithubComTogglTogglApiInternalModelsTimeEntry {
	tagIDs := intsFromInt64s(view.TagIDs)
	expenseIDs := intsFromInt64s(view.ExpenseIDs)
	tagNames := []string{}
	return publictrackapi.GithubComTogglTogglApiInternalModelsTimeEntry{
		At:            timePointer(view.UpdatedAt),
		Billable:      boolPointer(view.Billable),
		ClientId:      intPointerFromInt64Pointer(view.ClientID),
		ClientName:    view.ClientName,
		Description:   stringPointer(view.Description),
		Duration:      intPointerFromInt(view.Duration),
		ExpenseIds:    &expenseIDs,
		Id:            intPointer(view.ID),
		Pid:           intPointerFromInt64Pointer(view.ProjectID),
		ProjectActive: view.ProjectActive,
		ProjectId:     intPointerFromInt64Pointer(view.ProjectID),
		ProjectName:   view.ProjectName,
		Start:         timePointer(view.Start),
		Stop:          timePointerValue(view.Stop),
		TagIds:        &tagIDs,
		Tags:          &tagNames,
		TaskId:        intPointerFromInt64Pointer(view.TaskID),
		TaskName:      view.TaskName,
		Tid:           intPointerFromInt64Pointer(view.TaskID),
		Uid:           intPointer(view.UserID),
		UserId:        intPointer(view.UserID),
		Wid:           intPointer(view.WorkspaceID),
		WorkspaceId:   intPointer(view.WorkspaceID),
	}
}

func favoriteViewToAPI(view trackingapplication.FavoriteView) publictrackapi.ModelsFavorite {
	tagIDs := intsFromInt64s(view.TagIDs)
	return publictrackapi.ModelsFavorite{
		Billable:    boolPointer(view.Billable),
		CreatedAt:   timePointer(view.CreatedAt),
		DeletedAt:   timePointerValue(view.DeletedAt),
		Description: stringPointer(view.Description),
		FavoriteId:  intPointer(view.ID),
		ProjectId:   intPointerFromInt64Pointer(view.ProjectID),
		Public:      boolPointer(view.Public),
		Rank:        intPointerFromInt(view.Rank),
		TagIds:      &tagIDs,
		TaskId:      intPointerFromInt64Pointer(view.TaskID),
		UserId:      intPointer(view.UserID),
		WorkspaceId: intPointer(view.WorkspaceID),
	}
}

func goalViewToAPI(view trackingapplication.GoalView) publictrackapi.HandlergoalsAPIResponse {
	projectIDs := intsFromInt64s(view.ProjectIDs)
	taskIDs := intsFromInt64s(view.TaskIDs)
	tagIDs := intsFromInt64s(view.TagIDs)
	return publictrackapi.HandlergoalsAPIResponse{
		Active:        boolPointer(view.Active),
		Billable:      boolPointer(view.Billable),
		Comparison:    stringPointer(view.Comparison),
		CreatorUserId: intPointer(view.CreatorUserID),
		EndDate:       datePointerValue(view.EndDate),
		GoalId:        intPointer(view.ID),
		Icon:          stringPointer(view.Icon),
		Name:          stringPointer(view.Name),
		ProjectIds:    &projectIDs,
		Recurrence:    stringPointer(view.Recurrence),
		StartDate:     datePointer(view.StartDate),
		TagIds:        &tagIDs,
		TargetSeconds: intPointerFromInt(view.TargetSeconds),
		TaskIds:       &taskIDs,
		UserId:        intPointer(view.UserID),
		WorkspaceId:   intPointer(view.WorkspaceID),
	}
}

func reminderViewToAPI(view trackingapplication.ReminderView) publictrackapi.ModelsTrackReminder {
	groupIDs := intsFromInt64s(view.GroupIDs)
	userIDs := intsFromInt64s(view.UserIDs)
	return publictrackapi.ModelsTrackReminder{
		CreatedAt:             timePointer(view.CreatedAt),
		EmailReminderEnabled:  boolPointer(view.EmailReminderEnabled),
		Frequency:             intPointerFromInt(view.Frequency),
		GroupIds:              &groupIDs,
		ReminderId:            intPointer(view.ID),
		SlackReminderEnabled:  boolPointer(view.SlackReminderEnabled),
		Threshold:             intPointerFromInt(int(view.ThresholdHours)),
		UserIds:               &userIDs,
		WorkspaceId:           intPointer(view.WorkspaceID),
	}
}

func expenseViewToAPI(view trackingapplication.ExpenseView) publictrackapi.ExpensesExpense {
	return publictrackapi.ExpensesExpense{
		Category:      stringPointer(view.Category),
		CreatedAt:     timePointer(view.CreatedAt),
		Currency:      stringPointer(view.Currency),
		DateOfExpense: datePointer(view.DateOfExpense),
		DeletedAt:     timePointerValue(view.DeletedAt),
		Description:   stringPointer(view.Description),
		Id:            intPointer(view.ID),
		State:         stringPointer(view.State),
		TotalAmount:   intPointerFromInt(view.TotalAmount),
		UpdatedAt:     timePointer(view.UpdatedAt),
		UserId:        intPointer(view.UserID),
		WorkspaceId:   intPointer(view.WorkspaceID),
	}
}

func parseRequiredTrackRFC3339(value *string) (time.Time, error) {
	if value == nil {
		return time.Time{}, trackingapplication.ErrInvalidTimeRange
	}
	return time.Parse(time.RFC3339, strings.TrimSpace(*value))
}

func parseOptionalTrackRFC3339(value *string) (*time.Time, error) {
	if value == nil || strings.TrimSpace(*value) == "" {
		return nil, nil
	}
	parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(*value))
	if err != nil {
		return nil, err
	}
	parsed = parsed.UTC()
	return &parsed, nil
}

func parseTrackDate(value *string) (time.Time, error) {
	if value == nil || strings.TrimSpace(*value) == "" {
		return time.Time{}, trackingapplication.ErrInvalidTimeRange
	}
	return time.Parse("2006-01-02", strings.TrimSpace(*value))
}

func parseOptionalTrackDate(value *string) (*time.Time, error) {
	if value == nil || strings.TrimSpace(*value) == "" {
		return nil, nil
	}
	parsed, err := time.Parse("2006-01-02", strings.TrimSpace(*value))
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}

func parseTrackDateTime(value string, endOfDay bool) (time.Time, error) {
	if strings.Contains(value, "T") {
		parsed, err := time.Parse(time.RFC3339, value)
		if err != nil {
			return time.Time{}, err
		}
		return parsed.UTC(), nil
	}
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		return time.Time{}, err
	}
	if endOfDay {
		return parsed.Add(23*time.Hour + 59*time.Minute + 59*time.Second).UTC(), nil
	}
	return parsed.UTC(), nil
}

func int64sFromTrackInts(values *[]int) []int64 {
	if values == nil {
		return nil
	}
	converted := make([]int64, 0, len(*values))
	for _, value := range *values {
		converted = append(converted, int64(value))
	}
	return converted
}

func firstTrackIntPointerAsInt64(values ...*int) *int64 {
	for _, value := range values {
		if value != nil {
			converted := int64(*value)
			return &converted
		}
	}
	return nil
}

func int64PointerToIntPointer(value *int) *int {
	if value == nil {
		return nil
	}
	converted := *value
	return &converted
}

func int64ValueOr(fallback int64, value *int) int64 {
	if value == nil {
		return fallback
	}
	return int64(*value)
}

func float64Value(value *float32) float64 {
	if value == nil {
		return 0
	}
	return float64(*value)
}

func intValueOrZero(value *int) int {
	if value == nil {
		return 0
	}
	return *value
}

func interfaceValue(value *interface{}) any {
	if value == nil {
		return nil
	}
	return *value
}

func parseOptionalPathID(ctx echo.Context, key string) (int64, bool) {
	value := strings.TrimSpace(ctx.Param(key))
	if value == "" {
		return 0, false
	}
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return 0, false
	}
	return parsed, true
}

func queryInt64(ctx echo.Context, key string) (int64, bool) {
	value := strings.TrimSpace(ctx.QueryParam(key))
	if value == "" {
		return 0, false
	}
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return 0, false
	}
	return parsed, true
}

func timePointerValue(value *time.Time) *string {
	if value == nil {
		return nil
	}
	return timePointer(value.UTC())
}

func datePointerValue(value *time.Time) *string {
	if value == nil {
		return nil
	}
	return datePointer(value.UTC())
}

func defaultString(value *string, fallback string) string {
	if value == nil || strings.TrimSpace(*value) == "" {
		return fallback
	}
	return strings.TrimSpace(*value)
}

func bindPublicTrackExpensePayload(ctx echo.Context) (publictrackapi.ExpensesExpense, error) {
	contentType := strings.TrimSpace(ctx.Request().Header.Get(echo.HeaderContentType))
	if strings.HasPrefix(contentType, "multipart/form-data") {
		if _, err := ctx.FormFile("file"); err != nil {
			return publictrackapi.ExpensesExpense{}, err
		}
		totalAmount, err := optionalFormIntPointer(ctx, "total_amount")
		if err != nil {
			return publictrackapi.ExpensesExpense{}, err
		}
		userID, err := optionalFormIntPointer(ctx, "user_id")
		if err != nil {
			return publictrackapi.ExpensesExpense{}, err
		}
		workspaceID, err := optionalFormIntPointer(ctx, "workspace_id")
		if err != nil {
			return publictrackapi.ExpensesExpense{}, err
		}
		return publictrackapi.ExpensesExpense{
			Category:      optionalFormStringPointer(ctx, "category"),
			Currency:      optionalFormStringPointer(ctx, "currency"),
			DateOfExpense: optionalFormStringPointer(ctx, "date_of_expense"),
			Description:   optionalFormStringPointer(ctx, "description"),
			State:         optionalFormStringPointer(ctx, "state"),
			TotalAmount:   totalAmount,
			UserId:        userID,
			WorkspaceId:   workspaceID,
		}, nil
	}

	var payload publictrackapi.ExpensesExpense
	if err := ctx.Bind(&payload); err != nil {
		return publictrackapi.ExpensesExpense{}, err
	}
	return payload, nil
}

func optionalFormStringPointer(ctx echo.Context, key string) *string {
	value := strings.TrimSpace(ctx.FormValue(key))
	if value == "" {
		return nil
	}
	return &value
}

func optionalFormIntPointer(ctx echo.Context, key string) (*int, error) {
	value := strings.TrimSpace(ctx.FormValue(key))
	if value == "" {
		return nil, nil
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return nil, err
	}
	return &parsed, nil
}
