package publicapi

import (
	"net/http"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

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
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
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
