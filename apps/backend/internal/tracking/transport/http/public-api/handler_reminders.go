package publicapi

import (
	"net/http"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

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
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
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
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
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
