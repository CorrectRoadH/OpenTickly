package publicapi

import (
	"context"
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
		return echo.NewHTTPError(http.StatusBadRequest, "start_date and end_date are both required").SetInternal(err)
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

	tagIDs, err := handler.resolveTagIDs(ctxWithAuth, workspaceID, user.ID, payload.TagIds, payload.Tags)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}

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
		TagIDs:      tagIDs,
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
	rawBodyFields, err := bindTrackRequestBody(ctx, &payload)
	if err != nil {
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

	tagIDs, err := handler.resolveTagIDs(ctx.Request().Context(), workspaceID, user.ID, payload.TagIds, payload.Tags)
	if err != nil {
		return writePublicTrackTrackingError(err)
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
		ProjectID:   resolveTrackNullableProjectID(rawBodyFields, payload.ProjectId, payload.Pid),
		TaskID:      firstTrackIntPointerAsInt64(payload.TaskId, payload.Tid),
		TagIDs:      tagIDs,
		ReplaceTags: payload.TagIds != nil || payload.Tags != nil,
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

func (handler *Handler) resolveTagIDs(ctx context.Context, workspaceID int64, userID int64, tagIDs *[]int, tagNames *[]string) ([]int64, error) {
	if tagIDs != nil {
		return int64sFromTrackInts(tagIDs), nil
	}
	if tagNames != nil && len(*tagNames) > 0 {
		return handler.catalog.EnsureTagsByName(ctx, workspaceID, userID, *tagNames)
	}
	return nil, nil
}

