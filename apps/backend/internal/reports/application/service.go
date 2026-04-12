package application

import (
	"context"
	"slices"
	"strconv"
	"strings"
	"time"

	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"
	"opentoggl/backend/apps/backend/internal/log"
)

type SavedReportStore interface {
	List(ctx context.Context, workspaceID int64) ([]SavedReportView, error)
	Get(ctx context.Context, workspaceID, reportID int64) (SavedReportView, error)
	GetByToken(ctx context.Context, token string) (SavedReportView, error)
	Create(ctx context.Context, cmd CreateSavedReportCommand) (SavedReportView, error)
	Update(ctx context.Context, cmd UpdateSavedReportCommand) (SavedReportView, error)
	Delete(ctx context.Context, workspaceID, reportID int64) error
	BulkDelete(ctx context.Context, workspaceID int64, reportIDs []int64) error
}

type ScheduledReportStore interface {
	List(ctx context.Context, workspaceID int64) ([]ScheduledReportView, error)
	Create(ctx context.Context, cmd CreateScheduledReportCommand) (ScheduledReportView, error)
	Delete(ctx context.Context, workspaceID, reportID int64) error
}

type TrackingQueries interface {
	ListWorkspaceTimeEntries(
		ctx context.Context,
		workspaceID int64,
		since *time.Time,
	) ([]trackingapplication.TimeEntryView, error)
}

type MembershipQueries interface {
	ListWorkspaceMembers(
		ctx context.Context,
		workspaceID int64,
		requestedBy int64,
	) ([]membershipapplication.WorkspaceMemberView, error)
}

// RateResolver looks up the workspace-level billable rate.
type RateResolver interface {
	GetWorkspaceBillableRate(ctx context.Context, workspaceID int64) (amountCents int, currency string, ok bool)
}

type Service struct {
	membership       MembershipQueries
	now              func() time.Time
	rates            RateResolver
	tracking         TrackingQueries
	savedReports     SavedReportStore
	scheduledReports ScheduledReportStore
	logger           log.Logger
}

func NewService(tracking TrackingQueries, membership MembershipQueries, rates RateResolver, logger log.Logger) *Service {
	return &Service{
		membership: membership,
		now:        time.Now,
		rates:      rates,
		tracking:   tracking,
		logger:     logger,
	}
}

// WithSavedReportStore attaches saved report persistence to the service.
func (s *Service) WithSavedReportStore(store SavedReportStore) {
	s.savedReports = store
}

// WithScheduledReportStore attaches scheduled report persistence to the service.
func (s *Service) WithScheduledReportStore(store ScheduledReportStore) {
	s.scheduledReports = store
}

func (s *Service) ListSavedReports(ctx context.Context, workspaceID int64) ([]SavedReportView, error) {
	return s.savedReports.List(ctx, workspaceID)
}

func (s *Service) GetSavedReport(ctx context.Context, workspaceID, reportID int64) (SavedReportView, error) {
	return s.savedReports.Get(ctx, workspaceID, reportID)
}

func (s *Service) GetSavedReportByToken(ctx context.Context, token string) (SavedReportView, error) {
	return s.savedReports.GetByToken(ctx, token)
}

func (s *Service) CreateSavedReport(ctx context.Context, cmd CreateSavedReportCommand) (SavedReportView, error) {
	return s.savedReports.Create(ctx, cmd)
}

func (s *Service) UpdateSavedReport(ctx context.Context, cmd UpdateSavedReportCommand) (SavedReportView, error) {
	return s.savedReports.Update(ctx, cmd)
}

func (s *Service) DeleteSavedReport(ctx context.Context, workspaceID, reportID int64) error {
	return s.savedReports.Delete(ctx, workspaceID, reportID)
}

func (s *Service) BulkDeleteSavedReports(ctx context.Context, workspaceID int64, reportIDs []int64) error {
	return s.savedReports.BulkDelete(ctx, workspaceID, reportIDs)
}

func (s *Service) ListScheduledReports(ctx context.Context, workspaceID int64) ([]ScheduledReportView, error) {
	return s.scheduledReports.List(ctx, workspaceID)
}

func (s *Service) CreateScheduledReport(ctx context.Context, cmd CreateScheduledReportCommand) (ScheduledReportView, error) {
	return s.scheduledReports.Create(ctx, cmd)
}

func (s *Service) DeleteScheduledReport(ctx context.Context, workspaceID, reportID int64) error {
	return s.scheduledReports.Delete(ctx, workspaceID, reportID)
}

// BuildWeeklyReportEntries returns the raw time entries matching the query,
// used by data trends and other endpoints that need entry-level data.
func (service *Service) BuildWeeklyReportEntries(
	ctx context.Context,
	query Query,
) ([]trackingapplication.TimeEntryView, error) {
	location := resolveLocation(query.Timezone)
	startUTC := query.StartDate.In(location).UTC()
	entries, err := service.tracking.ListWorkspaceTimeEntries(ctx, query.WorkspaceID, &startUTC)
	if err != nil {
		return nil, err
	}
	// Apply query filters.
	var filtered []trackingapplication.TimeEntryView
	for _, entry := range entries {
		entryDay := normalizeToDay(entry.Start, location)
		startDay := normalizeToDay(query.StartDate, location)
		endDay := normalizeToDay(query.EndDate, location)
		if entryDay.Before(startDay) || entryDay.After(endDay) {
			continue
		}
		if !matchesQueryFilters(entry, query) {
			continue
		}
		duration := resolveDurationSeconds(entry, service.now())
		if duration <= 0 {
			continue
		}
		entry.Duration = duration
		filtered = append(filtered, entry)
	}
	return filtered, nil
}

// GetWorkspaceBillableRate exposes the rate resolver for handlers.
func (service *Service) GetWorkspaceBillableRate(
	ctx context.Context,
	workspaceID int64,
) (amountCents int, currency string, ok bool) {
	if service.rates == nil {
		return 0, "USD", false
	}
	return service.rates.GetWorkspaceBillableRate(ctx, workspaceID)
}

func (service *Service) BuildWeeklyReport(ctx context.Context, query Query) (WeeklyReport, error) {
	service.logger.InfoContext(ctx, "building weekly report",
		"workspace_id", query.WorkspaceID,
		"start_date", query.StartDate,
		"end_date", query.EndDate,
	)
	location := resolveLocation(query.Timezone)
	startUTC := query.StartDate.In(location).UTC()
	entries, err := service.tracking.ListWorkspaceTimeEntries(ctx, query.WorkspaceID, &startUTC)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get time entries for weekly report",
			"workspace_id", query.WorkspaceID,
			"error", err.Error(),
		)
		return WeeklyReport{}, err
	}
	members, err := service.membership.ListWorkspaceMembers(ctx, query.WorkspaceID, query.RequestedBy)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get workspace members for weekly report",
			"workspace_id", query.WorkspaceID,
			"error", err.Error(),
		)
		return WeeklyReport{}, err
	}

	userNames := buildUserNameIndex(members)
	dayCount := inclusiveDayCount(query.StartDate, query.EndDate, location)
	rowsByKey := map[weeklyRowKey]*WeeklyRow{}
	daysWithTime := map[int]struct{}{}
	totalSeconds := 0

	// Resolve workspace billable rate for amount calculation.
	rateCents, currency, hasRate := 0, "USD", false
	if service.rates != nil {
		rateCents, currency, hasRate = service.rates.GetWorkspaceBillableRate(
			ctx, query.WorkspaceID,
		)
	}

	for _, entry := range entries {
		dayIndex, ok := reportDayIndex(entry, query, location)
		if !ok {
			continue
		}

		if !matchesQueryFilters(entry, query) {
			continue
		}

		duration := resolveDurationSeconds(entry, service.now())
		if duration <= 0 {
			continue
		}

		key := weeklyRowKey{
			projectID: derefInt64(entry.ProjectID),
			userID:    entry.UserID,
		}
		row, found := rowsByKey[key]
		if !found {
			row = &WeeklyRow{
				BillableAmountsInCents: make([]int, dayCount),
				BillableSeconds:        make([]int, dayCount),
				ClientName:             derefString(entry.ClientName),
				Currency:               currency,
				HourlyRateInCents:      rateCents,
				ProjectID:              derefInt64(entry.ProjectID),
				ProjectName:            fallbackProjectName(entry.ProjectName),
				Seconds:                make([]int, dayCount),
				UserID:                 entry.UserID,
				UserName:               fallbackUserName(userNames[entry.UserID], entry.UserID),
			}
			rowsByKey[key] = row
		}

		row.Seconds[dayIndex] += duration
		if entry.Billable {
			row.BillableSeconds[dayIndex] += duration
			if hasRate {
				row.BillableAmountsInCents[dayIndex] += duration * rateCents / 3600
			}
		}
		totalSeconds += duration
		daysWithTime[dayIndex] = struct{}{}
	}

	rows := make([]WeeklyRow, 0, len(rowsByKey))
	totalBillableAmountCents := 0
	for _, row := range rowsByKey {
		totalBillableAmountCents += sumSeconds(row.BillableAmountsInCents)
		rows = append(rows, *row)
	}
	slices.SortFunc(rows, func(left WeeklyRow, right WeeklyRow) int {
		leftTotal := sumSeconds(left.Seconds)
		rightTotal := sumSeconds(right.Seconds)
		switch {
		case leftTotal != rightTotal:
			if leftTotal > rightTotal {
				return -1
			}
			return 1
		case left.ProjectName < right.ProjectName:
			return -1
		case left.ProjectName > right.ProjectName:
			return 1
		case left.UserName < right.UserName:
			return -1
		case left.UserName > right.UserName:
			return 1
		default:
			return 0
		}
	})

	return WeeklyReport{
		BillableAmountInCents: totalBillableAmountCents,
		Rows:                  rows,
		TotalSeconds:          totalSeconds,
		TrackedDays:           len(daysWithTime),
		TrackedWeekdays:       buildTrackedWeekdays(query.StartDate, dayCount, location),
	}, nil
}

func (service *Service) BuildSummaryReport(ctx context.Context, query Query) (SummaryReport, error) {
	service.logger.InfoContext(ctx, "building summary report",
		"workspace_id", query.WorkspaceID,
		"start_date", query.StartDate,
		"end_date", query.EndDate,
	)
	weekly, err := service.BuildWeeklyReport(ctx, query)
	if err != nil {
		return SummaryReport{}, err
	}

	groupsByProject := map[int64]*SummaryGroup{}
	for _, row := range weekly.Rows {
		group, found := groupsByProject[row.ProjectID]
		if !found {
			group = &SummaryGroup{
				Label:     row.ProjectName,
				ProjectID: row.ProjectID,
				SubGroups: []SummarySubGroup{},
			}
			groupsByProject[row.ProjectID] = group
		}

		group.Seconds += sumSeconds(row.Seconds)
		group.BillableSeconds += sumSeconds(row.BillableSeconds)
		group.SubGroups = append(group.SubGroups, SummarySubGroup{
			BillableSeconds: sumSeconds(row.BillableSeconds),
			Label:           row.UserName,
			Seconds:         sumSeconds(row.Seconds),
			UserID:          row.UserID,
		})
	}

	groups := make([]SummaryGroup, 0, len(groupsByProject))
	for _, group := range groupsByProject {
		slices.SortFunc(group.SubGroups, func(left SummarySubGroup, right SummarySubGroup) int {
			switch {
			case left.Seconds != right.Seconds:
				if left.Seconds > right.Seconds {
					return -1
				}
				return 1
			case left.Label < right.Label:
				return -1
			case left.Label > right.Label:
				return 1
			default:
				return 0
			}
		})
		groups = append(groups, *group)
	}
	slices.SortFunc(groups, func(left SummaryGroup, right SummaryGroup) int {
		switch {
		case left.Seconds != right.Seconds:
			if left.Seconds > right.Seconds {
				return -1
			}
			return 1
		case left.Label < right.Label:
			return -1
		case left.Label > right.Label:
			return 1
		default:
			return 0
		}
	})

	return SummaryReport{
		Groups:       groups,
		TotalSeconds: weekly.TotalSeconds,
		TrackedDays:  weekly.TrackedDays,
	}, nil
}

// ---------------------------------------------------------------------------
// Insights: Data Trends
// ---------------------------------------------------------------------------

func (service *Service) BuildProjectDataTrends(ctx context.Context, query ProjectDataTrendsQuery) ([]ProjectDataTrend, error) {
	service.logger.InfoContext(ctx, "building project data trends",
		"workspace_id", query.WorkspaceID,
		"start_date", query.StartDate,
		"end_date", query.EndDate,
	)

	location := resolveLocation(query.Timezone)

	// Determine the earliest date we need entries from.
	earliest := query.StartDate
	if query.PreviousPeriodStart != nil && query.PreviousPeriodStart.Before(earliest) {
		earliest = *query.PreviousPeriodStart
	}
	earliestUTC := earliest.In(location).UTC()

	entries, err := service.tracking.ListWorkspaceTimeEntries(ctx, query.WorkspaceID, &earliestUTC)
	if err != nil {
		return nil, err
	}

	currentDays := inclusiveDayCount(query.StartDate, query.EndDate, location)

	// Accumulate per-project.
	type projectAccum struct {
		currentSeconds  []int
		previousSeconds []int
		userSet         map[int64]struct{}
	}
	projects := map[int64]*projectAccum{}

	var previousDays int
	if query.PreviousPeriodStart != nil {
		previousDays = inclusiveDayCount(*query.PreviousPeriodStart, query.StartDate.AddDate(0, 0, -1), location)
	}

	for _, entry := range entries {
		projectID := derefInt64(entry.ProjectID)

		// Filter by project IDs if specified.
		if len(query.ProjectIDs) > 0 && !slices.Contains(query.ProjectIDs, projectID) {
			continue
		}
		// Filter by billable if specified.
		if query.Billable != nil && entry.Billable != *query.Billable {
			continue
		}

		duration := resolveDurationSeconds(entry, service.now())
		if duration <= 0 {
			continue
		}

		entryDay := normalizeToDay(entry.Start, location)
		startDay := normalizeToDay(query.StartDate, location)
		endDay := normalizeToDay(query.EndDate, location)

		acc, found := projects[projectID]
		if !found {
			acc = &projectAccum{
				currentSeconds:  make([]int, currentDays),
				previousSeconds: make([]int, previousDays),
				userSet:         map[int64]struct{}{},
			}
			projects[projectID] = acc
		}
		acc.userSet[entry.UserID] = struct{}{}

		// Current period.
		if !entryDay.Before(startDay) && !entryDay.After(endDay) {
			idx := int(entryDay.Sub(startDay).Hours() / 24)
			acc.currentSeconds[idx] += duration
		}

		// Previous period.
		if query.PreviousPeriodStart != nil && previousDays > 0 {
			prevStart := normalizeToDay(*query.PreviousPeriodStart, location)
			prevEnd := startDay.AddDate(0, 0, -1)
			if !entryDay.Before(prevStart) && !entryDay.After(prevEnd) {
				idx := int(entryDay.Sub(prevStart).Hours() / 24)
				if idx < previousDays {
					acc.previousSeconds[idx] += duration
				}
			}
		}
	}

	results := make([]ProjectDataTrend, 0, len(projects))
	for projectID, acc := range projects {
		userIDs := make([]int64, 0, len(acc.userSet))
		for uid := range acc.userSet {
			userIDs = append(userIDs, uid)
		}
		slices.Sort(userIDs)

		trend := ProjectDataTrend{
			ProjectID:             projectID,
			CurrentPeriodSeconds:  acc.currentSeconds,
			PreviousPeriodSeconds: acc.previousSeconds,
			UserIDs:               userIDs,
			Start:                 query.StartDate,
			End:                   query.EndDate,
			PreviousStart:         query.PreviousPeriodStart,
		}
		results = append(results, trend)
	}

	slices.SortFunc(results, func(a, b ProjectDataTrend) int {
		aTotal := sumSeconds(a.CurrentPeriodSeconds)
		bTotal := sumSeconds(b.CurrentPeriodSeconds)
		if aTotal != bTotal {
			if aTotal > bTotal {
				return -1
			}
			return 1
		}
		if a.ProjectID < b.ProjectID {
			return -1
		}
		if a.ProjectID > b.ProjectID {
			return 1
		}
		return 0
	})

	return results, nil
}

// ---------------------------------------------------------------------------
// Insights: Profitability
// ---------------------------------------------------------------------------

func (service *Service) BuildProjectProfitability(ctx context.Context, query ProjectProfitabilityQuery) ([]ProjectProfitabilityRow, error) {
	service.logger.InfoContext(ctx, "building project profitability",
		"workspace_id", query.WorkspaceID,
	)

	location := resolveLocation(query.Timezone)
	startUTC := query.StartDate.In(location).UTC()
	entries, err := service.tracking.ListWorkspaceTimeEntries(ctx, query.WorkspaceID, &startUTC)
	if err != nil {
		return nil, err
	}

	rateCents, currency, hasRate := 0, query.Currency, false
	if service.rates != nil {
		rateCents, currency, hasRate = service.rates.GetWorkspaceBillableRate(ctx, query.WorkspaceID)
	}
	if currency == "" {
		currency = "USD"
	}

	type accum struct {
		name            string
		color           string
		totalSeconds    int
		billableSeconds int
	}
	projects := map[int64]*accum{}

	for _, entry := range entries {
		projectID := derefInt64(entry.ProjectID)

		if len(query.ProjectIDs) > 0 && !slices.Contains(query.ProjectIDs, projectID) {
			continue
		}
		if query.NoClient || len(query.ClientIDs) > 0 {
			hasNoClient := entry.ClientID == nil
			inList := false
			if entry.ClientID != nil && len(query.ClientIDs) > 0 {
				inList = slices.Contains(query.ClientIDs, *entry.ClientID)
			}
			if !((query.NoClient && hasNoClient) || inList) {
				continue
			}
		}
		if query.Billable != nil && entry.Billable != *query.Billable {
			continue
		}

		entryDay := normalizeToDay(entry.Start, location)
		startDay := normalizeToDay(query.StartDate, location)
		endDay := normalizeToDay(query.EndDate, location)
		if entryDay.Before(startDay) || entryDay.After(endDay) {
			continue
		}

		duration := resolveDurationSeconds(entry, service.now())
		if duration <= 0 {
			continue
		}

		acc, found := projects[projectID]
		if !found {
			acc = &accum{
				name:  fallbackProjectName(entry.ProjectName),
				color: derefString(entry.ProjectColor),
			}
			projects[projectID] = acc
		}
		acc.totalSeconds += duration
		if entry.Billable {
			acc.billableSeconds += duration
		}
	}

	results := make([]ProjectProfitabilityRow, 0, len(projects))
	for projectID, acc := range projects {
		earnings := 0
		if hasRate {
			earnings = acc.billableSeconds * rateCents / 3600
		}
		results = append(results, ProjectProfitabilityRow{
			ProjectID:       projectID,
			ProjectName:     acc.name,
			ProjectColor:    acc.color,
			TotalSeconds:    acc.totalSeconds,
			BillableSeconds: acc.billableSeconds,
			Earnings:        earnings,
			Currency:        currency,
		})
	}

	slices.SortFunc(results, func(a, b ProjectProfitabilityRow) int {
		if a.TotalSeconds != b.TotalSeconds {
			if a.TotalSeconds > b.TotalSeconds {
				return -1
			}
			return 1
		}
		return strings.Compare(a.ProjectName, b.ProjectName)
	})

	return results, nil
}

func (service *Service) BuildEmployeeProfitability(ctx context.Context, query EmployeeProfitabilityQuery) ([]EmployeeProfitabilityRow, error) {
	service.logger.InfoContext(ctx, "building employee profitability",
		"workspace_id", query.WorkspaceID,
	)

	location := resolveLocation(query.Timezone)
	startUTC := query.StartDate.In(location).UTC()
	entries, err := service.tracking.ListWorkspaceTimeEntries(ctx, query.WorkspaceID, &startUTC)
	if err != nil {
		return nil, err
	}

	members, err := service.membership.ListWorkspaceMembers(ctx, query.WorkspaceID, query.RequestedBy)
	if err != nil {
		return nil, err
	}
	userNames := buildUserNameIndex(members)

	rateCents, currency, hasRate := 0, query.Currency, false
	if service.rates != nil {
		rateCents, currency, hasRate = service.rates.GetWorkspaceBillableRate(ctx, query.WorkspaceID)
	}
	if currency == "" {
		currency = "USD"
	}

	type accum struct {
		totalSeconds    int
		billableSeconds int
	}
	employees := map[int64]*accum{}

	for _, entry := range entries {
		if len(query.UserIDs) > 0 && !slices.Contains(query.UserIDs, entry.UserID) {
			continue
		}

		entryDay := normalizeToDay(entry.Start, location)
		startDay := normalizeToDay(query.StartDate, location)
		endDay := normalizeToDay(query.EndDate, location)
		if entryDay.Before(startDay) || entryDay.After(endDay) {
			continue
		}

		duration := resolveDurationSeconds(entry, service.now())
		if duration <= 0 {
			continue
		}

		acc, found := employees[entry.UserID]
		if !found {
			acc = &accum{}
			employees[entry.UserID] = acc
		}
		acc.totalSeconds += duration
		if entry.Billable {
			acc.billableSeconds += duration
		}
	}

	results := make([]EmployeeProfitabilityRow, 0, len(employees))
	for userID, acc := range employees {
		earnings := 0
		if hasRate {
			earnings = acc.billableSeconds * rateCents / 3600
		}
		results = append(results, EmployeeProfitabilityRow{
			UserID:          userID,
			UserName:        fallbackUserName(userNames[userID], userID),
			TotalSeconds:    acc.totalSeconds,
			BillableSeconds: acc.billableSeconds,
			Earnings:        earnings,
			Currency:        currency,
		})
	}

	slices.SortFunc(results, func(a, b EmployeeProfitabilityRow) int {
		if a.TotalSeconds != b.TotalSeconds {
			if a.TotalSeconds > b.TotalSeconds {
				return -1
			}
			return 1
		}
		return strings.Compare(a.UserName, b.UserName)
	})

	return results, nil
}

type weeklyRowKey struct {
	projectID int64
	userID    int64
}

// matchesQueryFilters returns true when the entry passes all active filters
// (project_ids, tag_ids, description substring) on the query.
func matchesQueryFilters(entry trackingapplication.TimeEntryView, query Query) bool {
	// Project filter: OR between "no project" flag and explicit ID list.
	if query.NoProject || len(query.ProjectIDs) > 0 {
		hasNoProject := entry.ProjectID == nil
		inList := false
		if entry.ProjectID != nil && len(query.ProjectIDs) > 0 {
			inList = slices.Contains(query.ProjectIDs, *entry.ProjectID)
		}
		if !((query.NoProject && hasNoProject) || inList) {
			return false
		}
	}

	// Tag filter: OR between "no tags" flag and explicit ID list.
	if query.NoTag || len(query.TagIDs) > 0 {
		hasNoTags := len(entry.TagIDs) == 0
		anyInList := false
		if len(query.TagIDs) > 0 {
			for _, entryTag := range entry.TagIDs {
				if slices.Contains(query.TagIDs, entryTag) {
					anyInList = true
					break
				}
			}
		}
		if !((query.NoTag && hasNoTags) || anyInList) {
			return false
		}
	}

	// Task filter: OR between "no task" flag and explicit ID list.
	if query.NoTask || len(query.TaskIDs) > 0 {
		hasNoTask := entry.TaskID == nil
		inList := false
		if entry.TaskID != nil && len(query.TaskIDs) > 0 {
			inList = slices.Contains(query.TaskIDs, *entry.TaskID)
		}
		if !((query.NoTask && hasNoTask) || inList) {
			return false
		}
	}

	if query.Description != "" {
		if !strings.Contains(
			strings.ToLower(entry.Description),
			strings.ToLower(query.Description),
		) {
			return false
		}
	}

	return true
}

func buildTrackedWeekdays(startDate time.Time, dayCount int, location *time.Location) []time.Time {
	days := make([]time.Time, 0, dayCount)
	localStart := startDate.In(location)
	for index := 0; index < dayCount; index += 1 {
		days = append(days, localStart.AddDate(0, 0, index))
	}
	return days
}

func buildUserNameIndex(members []membershipapplication.WorkspaceMemberView) map[int64]string {
	userNames := make(map[int64]string, len(members))
	for _, member := range members {
		if member.UserID == nil {
			continue
		}
		userNames[*member.UserID] = member.FullName
	}
	return userNames
}

func derefInt64(value *int64) int64 {
	if value == nil {
		return 0
	}
	return *value
}

func derefString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}

func fallbackProjectName(name *string) string {
	if label := derefString(name); label != "" {
		return label
	}
	return "(No project)"
}

func fallbackUserName(label string, userID int64) string {
	if label != "" {
		return label
	}
	return "User #" + timeEntryIDString(userID)
}

func inclusiveDayCount(startDate time.Time, endDate time.Time, location *time.Location) int {
	start := normalizeToDay(startDate, location)
	end := normalizeToDay(endDate, location)
	return int(end.Sub(start).Hours()/24) + 1
}

func normalizeToDay(value time.Time, location *time.Location) time.Time {
	local := value.In(location)
	return time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, location)
}

func reportDayIndex(entry trackingapplication.TimeEntryView, query Query, location *time.Location) (int, bool) {
	entryDate := entry.Start
	if entry.Stop != nil {
		entryDate = *entry.Stop
	}
	entryDay := normalizeToDay(entryDate, location)
	startDay := normalizeToDay(query.StartDate, location)
	endDay := normalizeToDay(query.EndDate, location)
	if entryDay.Before(startDay) || entryDay.After(endDay) {
		return 0, false
	}
	return int(entryDay.Sub(startDay).Hours() / 24), true
}

func resolveDurationSeconds(entry trackingapplication.TimeEntryView, now time.Time) int {
	if entry.Duration >= 0 {
		return entry.Duration
	}
	if entry.Stop == nil {
		return maxInt(0, int(now.Sub(entry.Start).Seconds()))
	}
	return maxInt(0, int(entry.Stop.Sub(entry.Start).Seconds()))
}

func resolveLocation(timezone string) *time.Location {
	if timezone == "" {
		return time.UTC
	}
	location, err := time.LoadLocation(timezone)
	if err != nil {
		return time.UTC
	}
	return location
}

func sumSeconds(values []int) int {
	total := 0
	for _, value := range values {
		total += value
	}
	return total
}

func timeEntryIDString(value int64) string {
	return strconv.FormatInt(value, 10)
}

func maxInt(left int, right int) int {
	if left > right {
		return left
	}
	return right
}
