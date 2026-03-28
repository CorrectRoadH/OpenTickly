package application

import (
	"context"
	"slices"
	"strconv"
	"strings"
	"time"

	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"
)

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
	membership MembershipQueries
	now        func() time.Time
	rates      RateResolver
	tracking   TrackingQueries
}

func NewService(tracking TrackingQueries, membership MembershipQueries, rates RateResolver) *Service {
	return &Service{
		membership: membership,
		now:        time.Now,
		rates:      rates,
		tracking:   tracking,
	}
}

func (service *Service) BuildWeeklyReport(ctx context.Context, query Query) (WeeklyReport, error) {
	location := resolveLocation(query.Timezone)
	startUTC := query.StartDate.In(location).UTC()
	entries, err := service.tracking.ListWorkspaceTimeEntries(ctx, query.WorkspaceID, &startUTC)
	if err != nil {
		return WeeklyReport{}, err
	}
	members, err := service.membership.ListWorkspaceMembers(ctx, query.WorkspaceID, query.RequestedBy)
	if err != nil {
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

type weeklyRowKey struct {
	projectID int64
	userID    int64
}

// matchesQueryFilters returns true when the entry passes all active filters
// (project_ids, tag_ids, description substring) on the query.
func matchesQueryFilters(entry trackingapplication.TimeEntryView, query Query) bool {
	if len(query.ProjectIDs) > 0 {
		entryProjectID := derefInt64(entry.ProjectID)
		if !slices.Contains(query.ProjectIDs, entryProjectID) {
			return false
		}
	}

	if len(query.TagIDs) > 0 {
		matched := false
		for _, entryTag := range entry.TagIDs {
			if slices.Contains(query.TagIDs, entryTag) {
				matched = true
				break
			}
		}
		if !matched {
			return false
		}
	}

	if len(query.TaskIDs) > 0 {
		entryTaskID := derefInt64(entry.TaskID)
		if entryTaskID == 0 || !slices.Contains(query.TaskIDs, entryTaskID) {
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
