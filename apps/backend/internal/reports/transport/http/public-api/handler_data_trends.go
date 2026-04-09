package publicapi

import (
	"net/http"
	"time"

	publicreportsapi "opentoggl/backend/apps/backend/internal/http/generated/publicreports"
	reportsapplication "opentoggl/backend/apps/backend/internal/reports/application"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

// ---------------------------------------------------------------------------
// Data Trends: Projects
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdDataTrendsProjects(
	ctx echo.Context,
	workspaceID int,
) error {
	user, err := handler.requireReportsScope(ctx, int64(workspaceID))
	if err != nil {
		return err
	}

	var request publicreportsapi.BaseDataTrendsPost
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	location := loadLocation(user.Timezone)
	startDate, endDate, err := parseDateRange(request.StartDate, request.EndDate, location)
	if err != nil {
		return err
	}

	entries, err := handler.reports.BuildWeeklyReportEntries(ctx.Request().Context(), reportsapplication.Query{
		WorkspaceID: int64(workspaceID),
		RequestedBy: user.ID,
		Timezone:    user.Timezone,
		StartDate:   startDate,
		EndDate:     endDate,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	resolution := lo.FromPtrOr(request.Resolution, "day")
	idSet := intSetFromRequest(request.Ids)

	// Aggregate by date + project.
	type key struct {
		date      string
		projectID int64
	}
	buckets := map[key]*publicreportsapi.ProjectsDataTrendsProject{}
	dates := map[string]struct{}{}

	rateCents, currency, hasRate := handler.reports.GetWorkspaceBillableRate(ctx.Request().Context(), int64(workspaceID))
	if request.Currency != nil && *request.Currency != "" {
		currency = *request.Currency
	}

	for _, e := range entries {
		pid := derefInt64Ptr(e.ProjectID)
		if len(idSet) > 0 && !idSet[pid] {
			continue
		}
		if request.Billable != nil && e.Billable != *request.Billable {
			continue
		}
		if e.Duration <= 0 {
			continue
		}

		dateStr := bucketDate(e.Start, location, resolution)
		dates[dateStr] = struct{}{}
		k := key{date: dateStr, projectID: pid}
		p, ok := buckets[k]
		if !ok {
			id := int(pid)
			p = &publicreportsapi.ProjectsDataTrendsProject{
				ProjectId: &id,
				Name:      e.ProjectName,
				Color:     e.ProjectColor,
			}
			buckets[k] = p
		}
		total := lo.FromPtrOr(p.TotalSeconds, 0) + e.Duration
		p.TotalSeconds = &total
		if e.Billable {
			bs := lo.FromPtrOr(p.BillableSeconds, 0) + e.Duration
			p.BillableSeconds = &bs
			if hasRate {
				earn := lo.FromPtrOr(p.Earnings, 0) + e.Duration*rateCents/3600
				p.Earnings = &earn
			}
		}
	}

	sortedDates := sortedKeys(dates)
	graphData := make([]publicreportsapi.ProjectsDataTrendsGraphData, 0, len(sortedDates))
	for _, d := range sortedDates {
		var projects []publicreportsapi.ProjectsDataTrendsProject
		for k, v := range buckets {
			if k.date == d {
				projects = append(projects, *v)
			}
		}
		graphData = append(graphData, publicreportsapi.ProjectsDataTrendsGraphData{
			Date:     lo.ToPtr(d),
			Projects: &projects,
		})
	}

	return ctx.JSON(http.StatusOK, publicreportsapi.ProjectsDataTrendsReport{
		Currency: &currency,
		Graph: &publicreportsapi.ProjectsDataTrendsGraph{
			Data:       &graphData,
			Resolution: &resolution,
		},
	})
}

// ---------------------------------------------------------------------------
// Data Trends: Clients
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdDataTrendsClients(
	ctx echo.Context,
	workspaceID int,
) error {
	user, err := handler.requireReportsScope(ctx, int64(workspaceID))
	if err != nil {
		return err
	}

	var request publicreportsapi.BaseDataTrendsPost
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	location := loadLocation(user.Timezone)
	startDate, endDate, err := parseDateRange(request.StartDate, request.EndDate, location)
	if err != nil {
		return err
	}

	entries, err := handler.reports.BuildWeeklyReportEntries(ctx.Request().Context(), reportsapplication.Query{
		WorkspaceID: int64(workspaceID),
		RequestedBy: user.ID,
		Timezone:    user.Timezone,
		StartDate:   startDate,
		EndDate:     endDate,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	resolution := lo.FromPtrOr(request.Resolution, "day")
	idSet := intSetFromRequest(request.Ids)

	type key struct {
		date     string
		clientID int64
	}
	buckets := map[key]*publicreportsapi.ClientsReportClient{}
	dates := map[string]struct{}{}

	rateCents, currency, hasRate := handler.reports.GetWorkspaceBillableRate(ctx.Request().Context(), int64(workspaceID))
	if request.Currency != nil && *request.Currency != "" {
		currency = *request.Currency
	}

	for _, e := range entries {
		cid := derefInt64Ptr(e.ClientID)
		if len(idSet) > 0 && !idSet[cid] {
			continue
		}
		if request.Billable != nil && e.Billable != *request.Billable {
			continue
		}
		if e.Duration <= 0 {
			continue
		}

		dateStr := bucketDate(e.Start, location, resolution)
		dates[dateStr] = struct{}{}
		k := key{date: dateStr, clientID: cid}
		c, ok := buckets[k]
		if !ok {
			id := int(cid)
			name := lo.FromPtrOr(e.ClientName, "(No client)")
			c = &publicreportsapi.ClientsReportClient{
				ClientId: &id,
				Name:     &name,
			}
			buckets[k] = c
		}
		total := lo.FromPtrOr(c.TotalSeconds, 0) + e.Duration
		c.TotalSeconds = &total
		if e.Billable {
			bs := lo.FromPtrOr(c.BillableSeconds, 0) + e.Duration
			c.BillableSeconds = &bs
			if hasRate {
				earn := lo.FromPtrOr(c.Earnings, 0) + e.Duration*rateCents/3600
				c.Earnings = &earn
			}
		}
	}

	// Build graph.
	sortedDates := sortedKeys(dates)
	data := make([]publicreportsapi.ClientsDataTrendsGraphData, 0, len(sortedDates))
	for _, d := range sortedDates {
		var clients []publicreportsapi.ClientsReportClient
		for k, v := range buckets {
			if k.date == d {
				clients = append(clients, *v)
			}
		}
		data = append(data, publicreportsapi.ClientsDataTrendsGraphData{
			Date:    lo.ToPtr(d),
			Clients: &clients,
		})
	}

	return ctx.JSON(http.StatusOK, publicreportsapi.ClientsDataTrendsReport{
		Currency: &currency,
		Graph: &publicreportsapi.ClientsDataTrendsGraph{
			Data:       &data,
			Resolution: &resolution,
		},
	})
}

// ---------------------------------------------------------------------------
// Data Trends: Users
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdDataTrendsUsers(
	ctx echo.Context,
	workspaceID int,
) error {
	user, err := handler.requireReportsScope(ctx, int64(workspaceID))
	if err != nil {
		return err
	}

	var request publicreportsapi.BaseDataTrendsPost
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	location := loadLocation(user.Timezone)
	startDate, endDate, err := parseDateRange(request.StartDate, request.EndDate, location)
	if err != nil {
		return err
	}

	entries, err := handler.reports.BuildWeeklyReportEntries(ctx.Request().Context(), reportsapplication.Query{
		WorkspaceID: int64(workspaceID),
		RequestedBy: user.ID,
		Timezone:    user.Timezone,
		StartDate:   startDate,
		EndDate:     endDate,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	members, err := handler.membership.ListWorkspaceMembers(
		ctx.Request().Context(), int64(workspaceID), user.ID,
	)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	userNames := map[int64]string{}
	for _, m := range members {
		if m.UserID != nil {
			userNames[*m.UserID] = m.FullName
		}
	}

	resolution := lo.FromPtrOr(request.Resolution, "day")
	idSet := intSetFromRequest(request.Ids)

	type key struct {
		date   string
		userID int64
	}
	buckets := map[key]*publicreportsapi.UsersDataTrendsUser{}
	dates := map[string]struct{}{}

	rateCents, currency, hasRate := handler.reports.GetWorkspaceBillableRate(ctx.Request().Context(), int64(workspaceID))
	if request.Currency != nil && *request.Currency != "" {
		currency = *request.Currency
	}

	for _, e := range entries {
		if len(idSet) > 0 && !idSet[e.UserID] {
			continue
		}
		if request.Billable != nil && e.Billable != *request.Billable {
			continue
		}
		if e.Duration <= 0 {
			continue
		}

		dateStr := bucketDate(e.Start, location, resolution)
		dates[dateStr] = struct{}{}
		k := key{date: dateStr, userID: e.UserID}
		u, ok := buckets[k]
		if !ok {
			id := int(e.UserID)
			name := userNames[e.UserID]
			if name == "" {
				name = "User"
			}
			u = &publicreportsapi.UsersDataTrendsUser{
				UserId: &id,
				Name:   &name,
			}
			buckets[k] = u
		}
		total := lo.FromPtrOr(u.TotalSeconds, 0) + e.Duration
		u.TotalSeconds = &total
		if e.Billable {
			bs := lo.FromPtrOr(u.BillableSeconds, 0) + e.Duration
			u.BillableSeconds = &bs
			if hasRate {
				earn := lo.FromPtrOr(u.Earnings, 0) + e.Duration*rateCents/3600
				u.Earnings = &earn
			}
		}
	}

	sortedDates := sortedKeys(dates)
	data := make([]publicreportsapi.UsersDataTrendsGraphData, 0, len(sortedDates))
	for _, d := range sortedDates {
		var users []publicreportsapi.UsersDataTrendsUser
		for k, v := range buckets {
			if k.date == d {
				users = append(users, *v)
			}
		}
		data = append(data, publicreportsapi.UsersDataTrendsGraphData{
			Date:  lo.ToPtr(d),
			Users: &users,
		})
	}

	return ctx.JSON(http.StatusOK, publicreportsapi.UsersDataTrendsReport{
		Currency: &currency,
		Graph: &publicreportsapi.UsersDataTrendsGraph{
			Data:       &data,
			Resolution: &resolution,
		},
	})
}

// ---------------------------------------------------------------------------
// Comparative
// ---------------------------------------------------------------------------

func (handler *Handler) PostReportsApiV3WorkspaceWorkspaceIdComparative(
	ctx echo.Context,
	workspaceID int,
) error {
	user, err := handler.requireReportsScope(ctx, int64(workspaceID))
	if err != nil {
		return err
	}

	var request publicreportsapi.ComparativeComparativePost
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
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
	}
	if request.ProjectIds != nil {
		query.ProjectIDs = intsToInt64s(*request.ProjectIds)
	}
	if request.TagIds != nil {
		query.TagIDs = intsToInt64s(*request.TagIds)
	}
	if request.TaskIds != nil {
		query.TaskIDs = intsToInt64s(*request.TaskIds)
	}

	entries, err := handler.reports.BuildWeeklyReportEntries(ctx.Request().Context(), query)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	resolution := lo.FromPtrOr(request.Resolution, "day")

	// Aggregate total seconds by date bucket.
	dateTotals := map[string]int{}
	for _, e := range entries {
		if request.Billable != nil && e.Billable != *request.Billable {
			continue
		}
		if e.Duration <= 0 {
			continue
		}
		dateStr := bucketDate(e.Start, location, resolution)
		dateTotals[dateStr] += e.Duration
	}

	sortedDates := sortedKeys(map[string]struct{}{})
	for d := range dateTotals {
		sortedDates = append(sortedDates, d)
	}
	sortStringSlice(sortedDates)

	data := make([]publicreportsapi.ComparativeGraphData, 0, len(sortedDates))
	for _, d := range sortedDates {
		total := dateTotals[d]
		data = append(data, publicreportsapi.ComparativeGraphData{
			Date:         lo.ToPtr(d),
			TotalSeconds: &total,
		})
	}

	return ctx.JSON(http.StatusOK, publicreportsapi.ComparativeReport{
		Graph: &publicreportsapi.ComparativeReportGraph{
			Data:       &data,
			Resolution: &resolution,
		},
	})
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func loadLocation(timezone string) *time.Location {
	if timezone == "" {
		return time.UTC
	}
	loc, err := time.LoadLocation(timezone)
	if err != nil {
		return time.UTC
	}
	return loc
}

func parseDate(s string, loc *time.Location) (time.Time, error) {
	t, err := time.ParseInLocation(time.DateOnly, s, loc)
	if err != nil {
		return time.Time{}, echo.NewHTTPError(http.StatusBadRequest, "Wrong format date").SetInternal(err)
	}
	return t, nil
}

func parseDateRange(startStr *string, endStr *string, loc *time.Location) (time.Time, time.Time, error) {
	if startStr == nil || endStr == nil {
		return time.Time{}, time.Time{}, echo.NewHTTPError(http.StatusBadRequest, "At least one parameter must be set")
	}
	start, err := time.ParseInLocation(time.DateOnly, *startStr, loc)
	if err != nil {
		return time.Time{}, time.Time{}, echo.NewHTTPError(http.StatusBadRequest, "Wrong format date").SetInternal(err)
	}
	end, err := time.ParseInLocation(time.DateOnly, *endStr, loc)
	if err != nil {
		return time.Time{}, time.Time{}, echo.NewHTTPError(http.StatusBadRequest, "Wrong format date").SetInternal(err)
	}
	return start, end, nil
}

func intSetFromRequest(ids *[]int) map[int64]bool {
	if ids == nil || len(*ids) == 0 {
		return nil
	}
	set := make(map[int64]bool, len(*ids))
	for _, id := range *ids {
		set[int64(id)] = true
	}
	return set
}

func derefInt64Ptr(v *int64) int64 {
	if v == nil {
		return 0
	}
	return *v
}

func bucketDate(t time.Time, loc *time.Location, resolution string) string {
	local := t.In(loc)
	switch resolution {
	case "week":
		year, week := local.ISOWeek()
		return time.Date(year, 1, 1, 0, 0, 0, 0, loc).
			AddDate(0, 0, (week-1)*7).Format(time.DateOnly)
	case "month":
		return time.Date(local.Year(), local.Month(), 1, 0, 0, 0, 0, loc).Format(time.DateOnly)
	default: // "day"
		return local.Format(time.DateOnly)
	}
}

func sortedKeys(m map[string]struct{}) []string {
	result := make([]string, 0, len(m))
	for k := range m {
		result = append(result, k)
	}
	sortStringSlice(result)
	return result
}

func sortStringSlice(s []string) {
	for i := 1; i < len(s); i++ {
		for j := i; j > 0 && s[j] < s[j-1]; j-- {
			s[j], s[j-1] = s[j-1], s[j]
		}
	}
}

