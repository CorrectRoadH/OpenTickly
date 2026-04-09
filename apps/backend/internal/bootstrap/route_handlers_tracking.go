package bootstrap

import (
	"net/http"
	"strings"
	"time"

	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"

	"github.com/labstack/echo/v4"
)

func (handlers *routeHandlers) searchWorkspaceTimeEntries(ctx echo.Context) error {
	if response, ok := handlers.authorizeSession(ctx); !ok {
		return response
	}
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handlers.requireCurrentSessionWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	query := strings.TrimSpace(ctx.QueryParam("query"))
	if query == "" {
		return echo.NewHTTPError(http.StatusBadRequest, "query parameter is required")
	}

	user, err := handlers.identityApp.ResolveCurrentUser(ctx.Request().Context(), sessionID(ctx))
	if err != nil {
		return echo.NewHTTPError(http.StatusForbidden, "Forbidden").SetInternal(err)
	}

	entries, err := handlers.trackingApp.SearchTimeEntries(ctx.Request().Context(), workspaceID, user.ID, query)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	items := make([]webapi.TimeEntrySearchItem, 0, len(entries))
	for _, entry := range entries {
		item := webapi.TimeEntrySearchItem{
			Id:           int(entry.ID),
			WorkspaceId:  int(entry.WorkspaceID),
			Description:  entry.Description,
			ProjectId:    intPointerFromInt64(entry.ProjectID),
			ProjectName:  entry.ProjectName,
			ProjectColor: entry.ProjectColor,
			TagIds:       int64SliceToIntSlice(entry.TagIDs),
			Tags:         entry.TagNames,
			Billable:     entry.Billable,
			Start:        entry.Start.Format(time.RFC3339),
			Duration:     entry.Duration,
		}
		if entry.Stop != nil {
			stop := entry.Stop.Format(time.RFC3339)
			item.Stop = &stop
		}
		items = append(items, item)
	}

	return ctx.JSON(http.StatusOK, webapi.TimeEntrySearchResult{Entries: items})
}

func intPointerFromInt64(value *int64) *int {
	if value == nil {
		return nil
	}
	v := int(*value)
	return &v
}

func int64SliceToIntSlice(values []int64) []int {
	result := make([]int, len(values))
	for i, v := range values {
		result[i] = int(v)
	}
	return result
}
