package application

import (
	"fmt"
	"maps"
	"slices"
	"strings"
	"time"
)

func dateOnly(value time.Time) time.Time {
	return time.Date(value.UTC().Year(), value.UTC().Month(), value.UTC().Day(), 0, 0, 0, 0, time.UTC)
}

func normalizePeriodicity(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "daily", "monthly":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return "weekly"
	}
}

func normalizeReminderDay(value int) int {
	if value < 0 || value > 6 {
		return 1
	}
	return value
}

func normalizeReminderTime(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "17:00"
	}
	return value
}

func alignPeriodStart(setup TimesheetSetupView, value time.Time) time.Time {
	value = dateOnly(value)
	start := dateOnly(setup.StartDate)
	if value.Before(start) {
		return start
	}
	switch normalizePeriodicity(setup.Periodicity) {
	case "daily":
		return value
	case "monthly":
		candidate := time.Date(value.Year(), value.Month(), start.Day(), 0, 0, 0, 0, time.UTC)
		for candidate.After(value) {
			candidate = candidate.AddDate(0, -1, 0)
		}
		for candidate.Before(start) {
			candidate = candidate.AddDate(0, 1, 0)
		}
		return candidate
	default:
		days := int(value.Sub(start).Hours() / 24)
		return start.AddDate(0, 0, (days/7)*7)
	}
}

func periodEnd(setup TimesheetSetupView, start time.Time) time.Time {
	start = dateOnly(start)
	var end time.Time
	switch normalizePeriodicity(setup.Periodicity) {
	case "daily":
		end = start
	case "monthly":
		end = start.AddDate(0, 1, -1)
	default:
		end = start.AddDate(0, 0, 6)
	}
	if setup.EndDate != nil && end.After(dateOnly(*setup.EndDate)) {
		return dateOnly(*setup.EndDate)
	}
	return end
}

func listWindow(after *time.Time, before *time.Time, now time.Time) (time.Time, time.Time) {
	switch {
	case after != nil && before != nil:
		return dateOnly(*after), dateOnly(*before)
	case after != nil:
		return dateOnly(*after), dateOnly(*after)
	case before != nil:
		return dateOnly(*before), dateOnly(*before)
	default:
		today := dateOnly(now)
		return today, today
	}
}

func listPeriodStarts(setup TimesheetSetupView, from time.Time, to time.Time) []time.Time {
	start := alignPeriodStart(setup, from)
	periods := make([]time.Time, 0)
	for !start.After(to) {
		if setup.EndDate != nil && start.After(dateOnly(*setup.EndDate)) {
			break
		}
		periods = append(periods, start)
		switch normalizePeriodicity(setup.Periodicity) {
		case "daily":
			start = start.AddDate(0, 0, 1)
		case "monthly":
			start = start.AddDate(0, 1, 0)
		default:
			start = start.AddDate(0, 0, 7)
		}
	}
	return periods
}

func buildSyntheticTimesheet(setup TimesheetSetupView, start time.Time) TimesheetView {
	end := periodEnd(setup, start)
	return TimesheetView{
		WorkspaceID:           setup.WorkspaceID,
		TimesheetSetupID:      setup.ID,
		MemberUserID:          setup.MemberUserID,
		MemberName:            setup.MemberName,
		ApproverUserID:        setup.ApproverUserID,
		ApproverName:          setup.ApproverName,
		ApproverUserIDs:       append([]int64{}, setup.ApproverUserIDs...),
		ApproverLayers:        cloneApproverLayers(setup.ApproverLayers),
		Periodicity:           setup.Periodicity,
		PeriodStart:           start,
		PeriodEnd:             end,
		StartDate:             start,
		EndDate:               end,
		Status:                "open",
		ReminderDay:           setup.ReminderDay,
		ReminderTime:          setup.ReminderTime,
		WorkingHoursInMinutes: workingMinutes(start, end),
		Timezone:              "UTC",
		CreatedAt:             setup.CreatedAt,
		UpdatedAt:             setup.UpdatedAt,
		KnownUserNames:        maps.Clone(setup.KnownUserNames),
	}
}

func workingMinutes(start time.Time, end time.Time) int {
	days := int(dateOnly(end).Sub(dateOnly(start)).Hours()/24) + 1
	if days < 1 {
		days = 1
	}
	return days * 8 * 60
}

func containsInt64(values []int64, target int64) bool {
	return slices.Contains(values, target)
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if strings.EqualFold(strings.TrimSpace(value), strings.TrimSpace(target)) {
			return true
		}
	}
	return false
}

func timesheetKey(setupID int64, start time.Time) string {
	return fmt.Sprintf("%d:%s", setupID, dateOnly(start).Format("2006-01-02"))
}

func paginateTimesheets(values []TimesheetView, page int, perPage int) []TimesheetView {
	start := (page - 1) * perPage
	if start >= len(values) {
		return []TimesheetView{}
	}
	end := start + perPage
	if end > len(values) {
		end = len(values)
	}
	return values[start:end]
}

func normalizeTimesheetStatus(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "submitted", "approved", "rejected", "reopened":
		return strings.ToLower(strings.TrimSpace(value))
	default:
		return "open"
	}
}

func reviewApprovedPointer(status string) *bool {
	switch status {
	case "approved":
		value := true
		return &value
	case "rejected":
		value := false
		return &value
	default:
		return nil
	}
}

func reviewerName(userID int64, current TimesheetView) string {
	if current.ApproverUserID != nil && *current.ApproverUserID == userID && current.ApproverName != nil {
		return *current.ApproverName
	}
	if current.MemberUserID == userID {
		return current.MemberName
	}
	return fmt.Sprintf("user-%d", userID)
}

func withPermissions(requesterUserID int64, timesheet TimesheetView) TimesheetView {
	return timesheet
}

func cloneApproverLayers(value map[string][]int64) map[string][]int64 {
	if len(value) == 0 {
		return map[string][]int64{}
	}
	cloned := make(map[string][]int64, len(value))
	for key, ids := range value {
		cloned[key] = slices.Clone(ids)
	}
	return cloned
}
