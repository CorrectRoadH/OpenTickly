package publicapi

import (
	"errors"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func (handler *Handler) GetPublicTrackTimeEntries(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}

	filter := trackingapplication.ListTimeEntriesFilter{UserID: user.ID, WorkspaceID: workspaceID}
	if since, ok := queryInt64(ctx, "since"); ok {
		timeValue := time.Unix(since, 0).UTC()
		filter.Since = &timeValue
		filter.IncludeAll = true
	}
	if before := strings.TrimSpace(ctx.QueryParam("before")); before != "" {
		value, parseErr := parseTrackDateTime(before, true)
		if parseErr != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(parseErr)
		}
		filter.Before = &value
	}
	startDate := strings.TrimSpace(ctx.QueryParam("start_date"))
	endDate := strings.TrimSpace(ctx.QueryParam("end_date"))
	if (startDate != "" && endDate == "") || (startDate == "" && endDate != "") {
		return echo.NewHTTPError(http.StatusBadRequest, "start_date and end_date are both required")
	}
	if startDate != "" {
		value, parseErr := parseTrackDateTime(startDate, false)
		if parseErr != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(parseErr)
		}
		filter.StartDate = &value
	}
	if endDate != "" {
		value, parseErr := parseTrackDateTime(endDate, true)
		if parseErr != nil {
			return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(parseErr)
		}
		filter.EndDate = &value
	}

	entries, err := handler.tracking.ListUserTimeEntries(ctx.Request().Context(), filter)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}

	response := make([]publictrackapi.GithubComTogglTogglApiInternalModelsTimeEntry, 0, len(entries))
	for _, entry := range entries {
		response = append(response, timeEntryViewToAPI(entry))
	}
	return ctx.JSON(http.StatusOK, response)
}

func (handler *Handler) GetPublicTrackTimeEntriesChecklist(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	entries, err := handler.tracking.ListUserTimeEntries(ctx.Request().Context(), trackingapplication.ListTimeEntriesFilter{
		UserID:      user.ID,
		WorkspaceID: workspaceID,
	})
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	created := len(entries) > 0
	return ctx.JSON(http.StatusOK, publictrackapi.ModelsTimeEntryChecklist{
		TimeEntriesCountCheck:   lo.ToPtr(created),
		TimeEntriesCreatedCheck: lo.ToPtr(created),
	})
}

func (handler *Handler) GetPublicTrackCurrentTimeEntry(ctx echo.Context) error {
	user, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	entry, err := handler.tracking.GetCurrentTimeEntry(ctx.Request().Context(), user.ID)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	if entry.ID == 0 {
		return ctx.JSON(http.StatusOK, nil)
	}
	return ctx.JSON(http.StatusOK, timeEntryViewToAPI(entry))
}

func (handler *Handler) GetPublicTrackWebTimer(ctx echo.Context) error {
	user, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	entry, err := handler.tracking.GetCurrentTimeEntry(ctx.Request().Context(), user.ID)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	if entry.ID == 0 {
		return ctx.JSON(http.StatusOK, nil)
	}
	return ctx.JSON(http.StatusOK, strconv.FormatInt(entry.ID, 10))
}

func (handler *Handler) GetPublicTrackTimeEntryByID(ctx echo.Context) error {
	user, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	timeEntryID, ok := parsePathID(ctx, "time_entry_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	entry, err := handler.tracking.GetUserTimeEntry(ctx.Request().Context(), user.ID, timeEntryID)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, timeEntryViewToAPI(entry))
}

func (handler *Handler) PostPublicTrackTimeEntry(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	var payload publictrackapi.TimeentryPayload
	if err := ctx.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	start, err := parseRequiredTrackRFC3339(payload.Start)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	stop, err := parseOptionalTrackRFC3339(payload.Stop)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	// Set authenticated user ID in context for service-level authorization validation.
	ctxWithAuth := trackingapplication.WithAuthenticatedUserID(ctx.Request().Context(), user.ID)

	entry, err := handler.tracking.CreateTimeEntry(ctxWithAuth, trackingapplication.CreateTimeEntryCommand{
		WorkspaceID: workspaceID,
		UserID:      user.ID,
		Billable:    lo.FromPtr(payload.Billable),
		Description: lo.FromPtr(payload.Description),
		Start:       start,
		Stop:        stop,
		Duration:    int64PointerToIntPointer(payload.Duration),
		CreatedWith: lo.FromPtr(payload.CreatedWith),
		ProjectID:   firstTrackIntPointerAsInt64(payload.ProjectId, payload.Pid),
		TaskID:      firstTrackIntPointerAsInt64(payload.TaskId, payload.Tid),
		TagIDs:      int64sFromTrackInts(payload.TagIds),
	})
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, timeEntryViewToAPI(entry))
}

func (handler *Handler) PutPublicTrackTimeEntry(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	timeEntryID, ok := parsePathID(ctx, "time_entry_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	var payload publictrackapi.TimeentryPayload
	if err := ctx.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	start, err := parseOptionalTrackRFC3339(payload.Start)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	stop, err := parseOptionalTrackRFC3339(payload.Stop)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	entry, err := handler.tracking.UpdateTimeEntry(ctx.Request().Context(), trackingapplication.UpdateTimeEntryCommand{
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

func (handler *Handler) PatchPublicTrackTimeEntries(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	rawIDsParam := strings.TrimSpace(ctx.Param("time_entry_ids"))
	rawIDs, _ := url.PathUnescape(rawIDsParam)
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
			Op:    lo.FromPtr(patch.Op),
			Path:  lo.FromPtr(patch.Path),
			Value: interfaceValue(patch.Value),
		})
	}
	success, err := handler.tracking.PatchTimeEntries(ctx.Request().Context(), workspaceID, user.ID, timeEntryIDs, patches)
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

func (handler *Handler) StopPublicTrackTimeEntry(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	timeEntryID, ok := parsePathID(ctx, "time_entry_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	entry, err := handler.tracking.StopTimeEntry(ctx.Request().Context(), workspaceID, user.ID, timeEntryID)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, timeEntryViewToAPI(entry))
}

func (handler *Handler) DeletePublicTrackTimeEntry(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	timeEntryID, ok := parsePathID(ctx, "time_entry_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.tracking.DeleteTimeEntry(ctx.Request().Context(), workspaceID, user.ID, timeEntryID); err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, "OK")
}

func (handler *Handler) GetPublicTrackFavorites(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	favorites, err := handler.tracking.ListFavorites(ctx.Request().Context(), workspaceID, user.ID)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	response := make([]publictrackapi.ModelsFavorite, 0, len(favorites))
	for _, favorite := range favorites {
		response = append(response, favoriteViewToAPI(favorite))
	}
	return ctx.JSON(http.StatusOK, response)
}

func (handler *Handler) PostPublicTrackFavorite(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	var payload publictrackapi.HandlerfavoritesPayload
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	favorite, err := handler.tracking.UpsertFavorite(ctx.Request().Context(), trackingapplication.UpsertFavoriteCommand{
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

func (handler *Handler) PutPublicTrackFavorite(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
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
	favorite, err := handler.tracking.UpsertFavorite(ctx.Request().Context(), trackingapplication.UpsertFavoriteCommand{
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

func (handler *Handler) PostPublicTrackFavoriteSuggestions(ctx echo.Context) error {
	return handler.GetPublicTrackFavorites(ctx)
}

func (handler *Handler) DeletePublicTrackFavorite(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	favoriteID, ok := parsePathID(ctx, "favorite_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.tracking.DeleteFavorite(ctx.Request().Context(), workspaceID, user.ID, favoriteID); err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, "OK")
}

func (handler *Handler) GetPublicTrackGoals(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
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
	goals, err := handler.tracking.ListGoals(ctx.Request().Context(), workspaceID, filter)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	response := make([]publictrackapi.HandlergoalsAPIResponse, 0, len(goals))
	for _, goal := range goals {
		response = append(response, goalViewToAPI(goal))
	}
	return ctx.JSON(http.StatusOK, response)
}

func (handler *Handler) GetPublicTrackGoal(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	goalID, ok := parsePathID(ctx, "goal_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	goal, err := handler.tracking.GetGoal(ctx.Request().Context(), workspaceID, user.ID, goalID)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, goalViewToAPI(goal))
}

func (handler *Handler) PostPublicTrackGoal(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
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
	goal, err := handler.tracking.CreateGoal(ctx.Request().Context(), trackingapplication.CreateGoalCommand{
		WorkspaceID:   workspaceID,
		UserID:        int64ValueOr(user.ID, payload.UserId),
		CreatorUserID: user.ID,
		Name:          lo.FromPtr(payload.Name),
		Billable:      lo.FromPtr(payload.Billable),
		Comparison:    lo.FromPtr(payload.Comparison),
		Recurrence:    lo.FromPtr(payload.Recurrence),
		Icon:          lo.FromPtr(payload.Icon),
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

func (handler *Handler) PutPublicTrackGoal(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
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
	goal, err := handler.tracking.UpdateGoal(ctx.Request().Context(), trackingapplication.UpdateGoalCommand{
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

func (handler *Handler) DeletePublicTrackGoal(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	goalID, ok := parsePathID(ctx, "goal_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.tracking.DeleteGoal(ctx.Request().Context(), workspaceID, user.ID, goalID); err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, "OK")
}

func (handler *Handler) GetPublicTrackSyncGoals(ctx echo.Context) error {
	return handler.GetPublicTrackGoals(ctx)
}

func (handler *Handler) GetPublicTrackTrackReminders(ctx echo.Context) error {
	workspaceID, _, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	reminders, err := handler.tracking.ListReminders(ctx.Request().Context(), workspaceID)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	response := make([]publictrackapi.ModelsTrackReminder, 0, len(reminders))
	for _, reminder := range reminders {
		response = append(response, reminderViewToAPI(reminder))
	}
	return ctx.JSON(http.StatusOK, response)
}

func (handler *Handler) GetPublicTrackMeTrackReminders(ctx echo.Context) error {
	return handler.GetPublicTrackTrackReminders(ctx)
}

func (handler *Handler) PostPublicTrackTrackReminder(ctx echo.Context) error {
	workspaceID, _, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	var payload publictrackapi.RemindersPayload
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	reminder, err := handler.tracking.UpsertReminder(ctx.Request().Context(), trackingapplication.UpsertReminderCommand{
		WorkspaceID:          workspaceID,
		Frequency:            intValueOrZero(payload.Frequency),
		ThresholdHours:       float64Value(payload.Threshold),
		EmailReminderEnabled: lo.FromPtr(payload.EmailReminderEnabled),
		SlackReminderEnabled: lo.FromPtr(payload.SlackReminderEnabled),
		UserIDs:              int64sFromTrackInts(payload.UserIds),
		GroupIDs:             int64sFromTrackInts(payload.GroupIds),
	})
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, reminderViewToAPI(reminder))
}

func (handler *Handler) PutPublicTrackTrackReminder(ctx echo.Context) error {
	workspaceID, _, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
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
	reminder, err := handler.tracking.UpsertReminder(ctx.Request().Context(), trackingapplication.UpsertReminderCommand{
		WorkspaceID:          workspaceID,
		ReminderID:           &reminderID,
		Frequency:            intValueOrZero(payload.Frequency),
		ThresholdHours:       float64Value(payload.Threshold),
		EmailReminderEnabled: lo.FromPtr(payload.EmailReminderEnabled),
		SlackReminderEnabled: lo.FromPtr(payload.SlackReminderEnabled),
		UserIDs:              int64sFromTrackInts(payload.UserIds),
		GroupIDs:             int64sFromTrackInts(payload.GroupIds),
	})
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, reminderViewToAPI(reminder))
}

func (handler *Handler) DeletePublicTrackTrackReminder(ctx echo.Context) error {
	workspaceID, _, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	reminderID, ok := parsePathID(ctx, "reminder_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.tracking.DeleteReminder(ctx.Request().Context(), workspaceID, reminderID); err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, "OK")
}

func (handler *Handler) GetPublicTrackExpenses(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	expenses, err := handler.tracking.ListExpenses(ctx.Request().Context(), workspaceID, user.ID)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	response := make([]publictrackapi.ExpensesExpense, 0, len(expenses))
	for _, expense := range expenses {
		response = append(response, expenseViewToAPI(expense))
	}
	return ctx.JSON(http.StatusOK, response)
}

func (handler *Handler) GetPublicTrackTimeline(ctx echo.Context) error {
	_, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	startTimestamp := queryInt(ctx, "start_date", 0)
	endTimestamp := queryInt(ctx, "end_date", 0)
	events, err := handler.tracking.ListTimelineEvents(ctx.Request().Context(), user.ID, startTimestamp, endTimestamp)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	response := make([]publictrackapi.ModelsTimelineEvent, 0, len(events))
	for _, event := range events {
		response = append(response, publictrackapi.ModelsTimelineEvent{
			DesktopId: lo.ToPtr(event.DesktopID),
			EndTime:   lo.ToPtr(event.EndTime),
			Filename:  lo.ToPtr(event.Filename),
			Id:        lo.ToPtr(int(event.ID)),
			Idle:      lo.ToPtr(event.Idle),
			StartTime: lo.ToPtr(event.StartTime),
			Title:     lo.ToPtr(event.Title),
		})
	}
	return ctx.JSON(http.StatusOK, response)
}

func (handler *Handler) PostPublicTrackTimeline(ctx echo.Context) error {
	_, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	var payload []publictrackapi.ModelsTimelineEvent
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	events := make([]trackingapplication.TimelineEventView, 0, len(payload))
	for _, event := range payload {
		events = append(events, trackingapplication.TimelineEventView{
			ID:        int64(lo.FromPtr(event.Id)),
			UserID:    user.ID,
			DesktopID: lo.FromPtr(event.DesktopId),
			Filename:  lo.FromPtr(event.Filename),
			Title:     lo.FromPtr(event.Title),
			StartTime: lo.FromPtr(event.StartTime),
			EndTime:   lo.FromPtr(event.EndTime),
			Idle:      lo.FromPtr(event.Idle),
		})
	}
	if err := handler.tracking.ReplaceTimelineEvents(ctx.Request().Context(), user.ID, events); err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, publictrackapi.ModelsTimelineSettings{
		RecordTimeline: lo.ToPtr(true),
	})
}

func (handler *Handler) DeletePublicTrackTimeline(ctx echo.Context) error {
	_, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	if err := handler.tracking.DeleteTimelineEvents(ctx.Request().Context(), user.ID); err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.NoContent(http.StatusOK)
}

func (handler *Handler) PostPublicTrackExpense(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
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
	expense, err := handler.tracking.CreateExpense(ctx.Request().Context(), trackingapplication.CreateExpenseCommand{
		WorkspaceID:   workspaceID,
		UserID:        int64ValueOr(user.ID, payload.UserId),
		TimeEntryID:   nil,
		Description:   lo.FromPtr(payload.Description),
		Category:      lo.FromPtr(payload.Category),
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

func writePublicTrackTrackingError(err error) error {
	switch {
	case errors.Is(err, trackingapplication.ErrRunningTimeEntryExists):
		return echo.NewHTTPError(http.StatusConflict, "Conflict").SetInternal(err)
	case trackingapplication.IsNotFound(err):
		return echo.NewHTTPError(http.StatusNotFound, "Not Found").SetInternal(err)
	case errors.Is(err, trackingapplication.ErrInvalidTimeRange),
		errors.Is(err, trackingapplication.ErrInvalidWorkspace):
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	default:
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
}

func timeEntryViewToAPI(view trackingapplication.TimeEntryView) publictrackapi.GithubComTogglTogglApiInternalModelsTimeEntry {
	tagIDs := intsFromInt64s(view.TagIDs)
	expenseIDs := intsFromInt64s(view.ExpenseIDs)
	tagNames := []string{}
	return publictrackapi.GithubComTogglTogglApiInternalModelsTimeEntry{
		At:            timePointer(view.UpdatedAt),
		Billable:      lo.ToPtr(view.Billable),
		ClientId:      intPointerFromInt64Pointer(view.ClientID),
		ClientName:    view.ClientName,
		Description:   lo.ToPtr(view.Description),
		Duration:      lo.ToPtr(view.Duration),
		ExpenseIds:    &expenseIDs,
		Id:            lo.ToPtr(int(view.ID)),
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
		Uid:           lo.ToPtr(int(view.UserID)),
		UserId:        lo.ToPtr(int(view.UserID)),
		Wid:           lo.ToPtr(int(view.WorkspaceID)),
		WorkspaceId:   lo.ToPtr(int(view.WorkspaceID)),
	}
}

func favoriteViewToAPI(view trackingapplication.FavoriteView) publictrackapi.ModelsFavorite {
	tagIDs := intsFromInt64s(view.TagIDs)
	return publictrackapi.ModelsFavorite{
		Billable:    lo.ToPtr(view.Billable),
		CreatedAt:   timePointer(view.CreatedAt),
		DeletedAt:   timePointerValue(view.DeletedAt),
		Description: lo.ToPtr(view.Description),
		FavoriteId:  lo.ToPtr(int(view.ID)),
		ProjectId:   intPointerFromInt64Pointer(view.ProjectID),
		Public:      lo.ToPtr(view.Public),
		Rank:        lo.ToPtr(view.Rank),
		TagIds:      &tagIDs,
		TaskId:      intPointerFromInt64Pointer(view.TaskID),
		UserId:      lo.ToPtr(int(view.UserID)),
		WorkspaceId: lo.ToPtr(int(view.WorkspaceID)),
	}
}

func goalViewToAPI(view trackingapplication.GoalView) publictrackapi.HandlergoalsAPIResponse {
	projectIDs := intsFromInt64s(view.ProjectIDs)
	taskIDs := intsFromInt64s(view.TaskIDs)
	tagIDs := intsFromInt64s(view.TagIDs)
	return publictrackapi.HandlergoalsAPIResponse{
		Active:        lo.ToPtr(view.Active),
		Billable:      lo.ToPtr(view.Billable),
		Comparison:    lo.ToPtr(view.Comparison),
		CreatorUserId: lo.ToPtr(int(view.CreatorUserID)),
		EndDate:       datePointerValue(view.EndDate),
		GoalId:        lo.ToPtr(int(view.ID)),
		Icon:          lo.ToPtr(view.Icon),
		Name:          lo.ToPtr(view.Name),
		ProjectIds:    &projectIDs,
		Recurrence:    lo.ToPtr(view.Recurrence),
		StartDate:     datePointer(view.StartDate),
		TagIds:        &tagIDs,
		TargetSeconds: lo.ToPtr(view.TargetSeconds),
		TaskIds:       &taskIDs,
		UserId:        lo.ToPtr(int(view.UserID)),
		WorkspaceId:   lo.ToPtr(int(view.WorkspaceID)),
	}
}

func reminderViewToAPI(view trackingapplication.ReminderView) publictrackapi.ModelsTrackReminder {
	groupIDs := intsFromInt64s(view.GroupIDs)
	userIDs := intsFromInt64s(view.UserIDs)
	return publictrackapi.ModelsTrackReminder{
		CreatedAt:            timePointer(view.CreatedAt),
		EmailReminderEnabled: lo.ToPtr(view.EmailReminderEnabled),
		Frequency:            lo.ToPtr(view.Frequency),
		GroupIds:             &groupIDs,
		ReminderId:           lo.ToPtr(int(view.ID)),
		SlackReminderEnabled: lo.ToPtr(view.SlackReminderEnabled),
		Threshold:            lo.ToPtr(int(view.ThresholdHours)),
		UserIds:              &userIDs,
		WorkspaceId:          lo.ToPtr(int(view.WorkspaceID)),
	}
}

func expenseViewToAPI(view trackingapplication.ExpenseView) publictrackapi.ExpensesExpense {
	return publictrackapi.ExpensesExpense{
		Category:      lo.ToPtr(view.Category),
		CreatedAt:     timePointer(view.CreatedAt),
		Currency:      lo.ToPtr(view.Currency),
		DateOfExpense: datePointer(view.DateOfExpense),
		DeletedAt:     timePointerValue(view.DeletedAt),
		Description:   lo.ToPtr(view.Description),
		Id:            lo.ToPtr(int(view.ID)),
		State:         lo.ToPtr(view.State),
		TotalAmount:   lo.ToPtr(view.TotalAmount),
		UpdatedAt:     timePointer(view.UpdatedAt),
		UserId:        lo.ToPtr(int(view.UserID)),
		WorkspaceId:   lo.ToPtr(int(view.WorkspaceID)),
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
