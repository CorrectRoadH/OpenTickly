package publicapi

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publicreportsapi "opentoggl/backend/apps/backend/internal/http/generated/publicreports"
	reportsapplication "opentoggl/backend/apps/backend/internal/reports/application"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

// ---------------------------------------------------------------------------
// Search: Clients
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdSearchClients(
	ctx echo.Context,
	workspaceID int,
) error {
	if _, err := handler.requireReportsScope(ctx, int64(workspaceID)); err != nil {
		return err
	}

	var request publicreportsapi.DtoClientFilterParamsRequest
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	filter := catalogapplication.ListClientsFilter{}
	if request.Name != nil {
		filter.Name = *request.Name
	}

	clients, err := handler.catalog.ListClients(ctx.Request().Context(), int64(workspaceID), filter)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	result := make([]publicreportsapi.DtoClientFilterResponse, 0, len(clients))
	for _, c := range clients {
		if request.Ids != nil && len(*request.Ids) > 0 && !containsInt(*request.Ids, int(c.ID)) {
			continue
		}
		id := int(c.ID)
		result = append(result, publicreportsapi.DtoClientFilterResponse{
			Id:   &id,
			Name: lo.ToPtr(c.Name),
		})
	}
	return ctx.JSON(http.StatusOK, result)
}

// ---------------------------------------------------------------------------
// Search: Projects
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdSearchProjects(
	ctx echo.Context,
	workspaceID int,
) error {
	if _, err := handler.requireReportsScope(ctx, int64(workspaceID)); err != nil {
		return err
	}

	var request publicreportsapi.DtoProjectFilterParamRequest
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	filter := catalogapplication.ListProjectsFilter{Active: request.IsActive}
	if request.Name != nil {
		filter.Name = *request.Name
	}

	projects, err := handler.catalog.ListProjects(ctx.Request().Context(), int64(workspaceID), filter)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	result := make([]publicreportsapi.DtoProjectFilterResponse, 0, len(projects))
	for _, p := range projects {
		if request.Ids != nil && len(*request.Ids) > 0 && !containsInt(*request.Ids, int(p.ID)) {
			continue
		}
		id := int(p.ID)
		entry := publicreportsapi.DtoProjectFilterResponse{
			Active:   lo.ToPtr(p.Active),
			Billable: lo.ToPtr(p.Billable),
			Color:    lo.ToPtr(p.Color),
			Id:       &id,
			Name:     lo.ToPtr(p.Name),
		}
		if p.ClientID != nil {
			entry.ClientId = lo.ToPtr(int(*p.ClientID))
		}
		if p.Currency != nil {
			entry.Currency = p.Currency
		}
		result = append(result, entry)
	}
	return ctx.JSON(http.StatusOK, result)
}

// ---------------------------------------------------------------------------
// Search: Users
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdSearchUsers(
	ctx echo.Context,
	workspaceID int,
) error {
	user, err := handler.requireReportsScope(ctx, int64(workspaceID))
	if err != nil {
		return err
	}

	var request publicreportsapi.DtoUserFilterParamsRequest
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	members, err := handler.membership.ListWorkspaceMembers(
		ctx.Request().Context(), int64(workspaceID), user.ID,
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	result := make([]publicreportsapi.DtoUserFilterResponse, 0, len(members))
	for _, m := range members {
		if m.UserID == nil {
			continue
		}
		if request.Ids != nil && len(*request.Ids) > 0 && !containsInt(*request.Ids, int(*m.UserID)) {
			continue
		}
		id := int(*m.UserID)
		result = append(result, publicreportsapi.DtoUserFilterResponse{
			Id:   &id,
			Name: lo.ToPtr(m.FullName),
		})
	}
	return ctx.JSON(http.StatusOK, result)
}

// ---------------------------------------------------------------------------
// Search: Time Entries (Detailed Report)
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdSearchTimeEntries(
	ctx echo.Context,
	workspaceID int,
) error {
	user, err := handler.requireReportsScope(ctx, int64(workspaceID))
	if err != nil {
		return err
	}

	var request publicreportsapi.DetailedPost
	filters, err := bindWithNullableIDs(ctx, &request)
	if err != nil {
		return err
	}

	location := loadLocation(user.Timezone)
	startDate, endDate, err := parseDateRange(request.StartDate, request.EndDate, location)
	if err != nil {
		return err
	}

	query := reportsapplication.Query{
		WorkspaceID: int64(workspaceID),
		RequestedBy: user.ID,
		Timezone:    user.Timezone,
		StartDate:   startDate,
		EndDate:     endDate,
		ProjectIDs:  filters.ProjectIDs,
		NoProject:   filters.NoProject,
		TagIDs:      filters.TagIDs,
		NoTag:       filters.NoTag,
		TaskIDs:     filters.TaskIDs,
		NoTask:      filters.NoTask,
	}
	if request.Description != nil {
		query.Description = *request.Description
	}

	entries, err := handler.reports.BuildWeeklyReportEntries(ctx.Request().Context(), query)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	// Filter by billable.
	if request.Billable != nil {
		var filtered []trackingapplication.TimeEntryView
		for _, e := range entries {
			if e.Billable == *request.Billable {
				filtered = append(filtered, e)
			}
		}
		entries = filtered
	}

	// Build response rows.
	type detailedRow struct {
		ID          int    `json:"id"`
		UserID      int    `json:"user_id"`
		ProjectID   *int   `json:"project_id,omitempty"`
		TaskID      *int   `json:"task_id,omitempty"`
		Description string `json:"description"`
		Billable    bool   `json:"billable"`
		Start       string `json:"start"`
		Stop        string `json:"stop,omitempty"`
		Duration    int    `json:"dur"`
		TagIDs      []int  `json:"tag_ids,omitempty"`
	}

	rows := make([]detailedRow, 0, len(entries))
	for _, e := range entries {
		row := detailedRow{
			ID:          int(e.ID),
			UserID:      int(e.UserID),
			Description: e.Description,
			Billable:    e.Billable,
			Start:       e.Start.Format("2006-01-02T15:04:05+00:00"),
			Duration:    e.Duration * 1000, // Toggl returns milliseconds.
		}
		if e.ProjectID != nil {
			row.ProjectID = lo.ToPtr(int(*e.ProjectID))
		}
		if e.TaskID != nil {
			row.TaskID = lo.ToPtr(int(*e.TaskID))
		}
		if e.Stop != nil {
			row.Stop = e.Stop.Format("2006-01-02T15:04:05+00:00")
		}
		if len(e.TagIDs) > 0 {
			row.TagIDs = make([]int, len(e.TagIDs))
			for i, tid := range e.TagIDs {
				row.TagIDs[i] = int(tid)
			}
		}
		rows = append(rows, row)
	}

	return ctx.JSON(http.StatusOK, rows)
}

// ---------------------------------------------------------------------------
// Search: Time Entries Export (csv)
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdSearchTimeEntriesExtension(
	ctx echo.Context,
	workspaceID int,
	extension string,
) error {
	if extension != "csv" {
		return echo.NewHTTPError(http.StatusBadRequest, "Only csv export is currently supported")
	}

	user, err := handler.requireReportsScope(ctx, int64(workspaceID))
	if err != nil {
		return err
	}

	var request publicreportsapi.DetailedSearchExportPost
	filters, err := bindWithNullableIDs(ctx, &request)
	if err != nil {
		return err
	}

	location := loadLocation(user.Timezone)
	startDate, endDate, err := parseDateRange(request.StartDate, request.EndDate, location)
	if err != nil {
		return err
	}

	query := reportsapplication.Query{
		WorkspaceID: int64(workspaceID),
		RequestedBy: user.ID,
		Timezone:    user.Timezone,
		StartDate:   startDate,
		EndDate:     endDate,
		ProjectIDs:  filters.ProjectIDs,
		NoProject:   filters.NoProject,
		TagIDs:      filters.TagIDs,
		NoTag:       filters.NoTag,
		TaskIDs:     filters.TaskIDs,
		NoTask:      filters.NoTask,
	}
	if request.Description != nil {
		query.Description = *request.Description
	}

	entries, err := handler.reports.BuildWeeklyReportEntries(ctx.Request().Context(), query)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	ctx.Response().Header().Set("Content-Type", "text/csv")
	ctx.Response().Header().Set("Content-Disposition", "attachment; filename=time_entries.csv")
	ctx.Response().WriteHeader(http.StatusOK)

	w := csv.NewWriter(ctx.Response())
	_ = w.Write([]string{"Description", "Project", "Start", "Stop", "Duration (s)", "Billable"})
	for _, e := range entries {
		stop := ""
		if e.Stop != nil {
			stop = e.Stop.Format("2006-01-02 15:04:05")
		}
		_ = w.Write([]string{
			e.Description,
			lo.FromPtrOr(e.ProjectName, ""),
			e.Start.Format("2006-01-02 15:04:05"),
			stop,
			strconv.Itoa(e.Duration),
			fmt.Sprintf("%t", e.Billable),
		})
	}
	w.Flush()
	return nil
}

// ---------------------------------------------------------------------------
// Search: Time Entries PDF (stub — no PDF library)
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdSearchTimeEntriesPdf(
	ctx echo.Context,
	workspaceID int,
) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "PDF export is not yet supported")
}

// ---------------------------------------------------------------------------
// Search: Time Entries Totals
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdSearchTimeEntriesTotals(
	ctx echo.Context,
	workspaceID int,
) error {
	user, err := handler.requireReportsScope(ctx, int64(workspaceID))
	if err != nil {
		return err
	}

	var request publicreportsapi.TotalsReportPost
	filters, err := bindWithNullableIDs(ctx, &request)
	if err != nil {
		return err
	}

	location := loadLocation(user.Timezone)
	startDate, endDate, err := parseDateRange(request.StartDate, request.EndDate, location)
	if err != nil {
		return err
	}

	query := reportsapplication.Query{
		WorkspaceID: int64(workspaceID),
		RequestedBy: user.ID,
		Timezone:    user.Timezone,
		StartDate:   startDate,
		EndDate:     endDate,
		ProjectIDs:  filters.ProjectIDs,
		NoProject:   filters.NoProject,
		TagIDs:      filters.TagIDs,
		NoTag:       filters.NoTag,
		TaskIDs:     filters.TaskIDs,
		NoTask:      filters.NoTask,
	}
	if request.Description != nil {
		query.Description = *request.Description
	}

	entries, err := handler.reports.BuildWeeklyReportEntries(ctx.Request().Context(), query)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	totalSeconds := 0
	billableSeconds := 0
	for _, e := range entries {
		if request.Billable != nil && e.Billable != *request.Billable {
			continue
		}
		totalSeconds += e.Duration
		if e.Billable {
			billableSeconds += e.Duration
		}
	}

	rateCents, _, hasRate := handler.reports.GetWorkspaceBillableRate(ctx.Request().Context(), int64(workspaceID))
	billableAmountCents := 0
	if hasRate {
		billableAmountCents = billableSeconds * rateCents / 3600
	}

	// Build per-date graph if granularity is specified.
	granularity := lo.FromPtrOr(request.Granularity, "day")
	dateTotals := map[string]publicreportsapi.TotalsGraph{}
	for _, e := range entries {
		if request.Billable != nil && e.Billable != *request.Billable {
			continue
		}
		dateStr := bucketDate(e.Start, location, granularity)
		g := dateTotals[dateStr]
		secs := lo.FromPtrOr(g.Seconds, 0) + e.Duration
		g.Seconds = &secs
		if e.Billable && hasRate {
			ba := lo.FromPtrOr(g.BillableAmountInCents, 0) + e.Duration*rateCents/3600
			g.BillableAmountInCents = &ba
		}
		dateTotals[dateStr] = g
	}
	graph := make([]publicreportsapi.TotalsGraph, 0, len(dateTotals))
	for _, g := range dateTotals {
		graph = append(graph, g)
	}

	return ctx.JSON(http.StatusOK, publicreportsapi.TotalsReportData{
		Seconds:               &totalSeconds,
		BillableAmountInCents: lo.ToPtr(billableAmountCents),
		Graph:                 &graph,
	})
}
