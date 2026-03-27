package publicapi

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	governanceapplication "opentoggl/backend/apps/backend/internal/governance/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

type ScopeAuthorizer interface {
	RequirePublicTrackUser(ctx echo.Context) (*identityapplication.UserSnapshot, error)
	RequirePublicTrackHome(ctx echo.Context) (organizationID int64, workspaceID int64, err error)
	RequirePublicTrackOrganization(ctx echo.Context, organizationID int64) error
	RequirePublicTrackWorkspace(ctx echo.Context, workspaceID int64) error
}

type Handler struct {
	governance *governanceapplication.Service
	scope      ScopeAuthorizer
}

func NewHandler(governance *governanceapplication.Service, scope ScopeAuthorizer) *Handler {
	return &Handler{
		governance: governance,
		scope:      scope,
	}
}

func writeGovernanceError(err error) error {
	switch {
	case errors.Is(err, governanceapplication.ErrInvalidOrganization),
		errors.Is(err, governanceapplication.ErrInvalidWorkspace),
		errors.Is(err, governanceapplication.ErrInvalidAuditLogWindow),
		errors.Is(err, governanceapplication.ErrInvalidTimesheetDate):
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
	case errors.Is(err, governanceapplication.ErrAlertNotFound),
		errors.Is(err, governanceapplication.ErrTimesheetSetupNotFound),
		errors.Is(err, governanceapplication.ErrTimesheetNotFound):
		return echo.NewHTTPError(http.StatusNotFound, "Not Found")
	default:
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}
}

func parsePathID(ctx echo.Context, key string) (int64, bool) {
	value, err := strconv.ParseInt(ctx.Param(key), 10, 64)
	if err != nil {
		return 0, false
	}
	return value, true
}

func parseDate(value string) (time.Time, error) {
	return time.Parse("2006-01-02", strings.TrimSpace(value))
}

func parseCSVInt64s(value string) []int64 {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	parsed := make([]int64, 0, len(parts))
	for _, part := range parts {
		value, err := strconv.ParseInt(strings.TrimSpace(part), 10, 64)
		if err == nil {
			parsed = append(parsed, value)
		}
	}
	return parsed
}

func parseCSVStrings(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	parts := strings.Split(value, ",")
	parsed := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			parsed = append(parsed, trimmed)
		}
	}
	return parsed
}

func apiApprovers(ids []int64, names map[int64]string) []publictrackapi.TimesheetsetupsApprovers {
	approvers := make([]publictrackapi.TimesheetsetupsApprovers, 0, len(ids))
	for _, id := range ids {
		name := names[id]
		approvers = append(approvers, publictrackapi.TimesheetsetupsApprovers{
			Active:  lo.ToPtr(true),
			Deleted: lo.ToPtr(false),
			Name:    lo.ToPtr(name),
			UserId:  lo.ToPtr(int(id)),
		})
	}
	return approvers
}

func apiTimesheetApprovers(ids []int64, names map[int64]string) []publictrackapi.TimesheetsApprover {
	approvers := make([]publictrackapi.TimesheetsApprover, 0, len(ids))
	for _, id := range ids {
		name := names[id]
		approvers = append(approvers, publictrackapi.TimesheetsApprover{
			Active:  lo.ToPtr(true),
			Deleted: lo.ToPtr(false),
			Name:    lo.ToPtr(name),
			UserId:  lo.ToPtr(int(id)),
		})
	}
	return approvers
}

func apiTimesheetSetup(view governanceapplication.TimesheetSetupView) publictrackapi.TimesheetsetupsAPITimesheetSetup {
	approvers := apiApprovers(view.ApproverUserIDs, view.KnownUserNames)
	approverLayers := make(map[string][]publictrackapi.TimesheetsetupsApprovers, len(view.ApproverLayers))
	for layer, ids := range view.ApproverLayers {
		approverLayers[layer] = apiApprovers(ids, view.KnownUserNames)
	}
	permissions := []string{"view"}
	var approverID *int
	if view.ApproverUserID != nil {
		approverID = lo.ToPtr(int(*view.ApproverUserID))
	}
	return publictrackapi.TimesheetsetupsAPITimesheetSetup{
		ApproverId:           approverID,
		ApproverName:         view.ApproverName,
		Approvers:            lo.ToPtr(approvers),
		ApproversLayers:      lo.ToPtr(approverLayers),
		EmailReminderEnabled: lo.ToPtr(view.EmailReminderEnabled),
		EndDate:              datePointer(view.EndDate),
		Id:                   lo.ToPtr(int(view.ID)),
		MemberId:             lo.ToPtr(int(view.MemberUserID)),
		MemberName:           lo.ToPtr(view.MemberName),
		Periodicity:          lo.ToPtr(view.Periodicity),
		Permissions:          lo.ToPtr(permissions),
		ReminderDay:          lo.ToPtr(publictrackapi.TimeWeekday(view.ReminderDay)),
		ReminderTime:         lo.ToPtr(view.ReminderTime),
		SlackReminderEnabled: lo.ToPtr(view.SlackReminderEnabled),
		StartDate:            lo.ToPtr(view.StartDate.UTC().Format("2006-01-02")),
		WorkspaceId:          lo.ToPtr(int(view.WorkspaceID)),
	}
}

func apiTimesheet(view governanceapplication.TimesheetView) publictrackapi.TimesheetsAPITimesheet {
	approvers := apiTimesheetApprovers(view.ApproverUserIDs, view.KnownUserNames)
	approverLayers := make(map[string][]publictrackapi.TimesheetsApprover, len(view.ApproverLayers))
	for layer, ids := range view.ApproverLayers {
		approverLayers[layer] = apiTimesheetApprovers(ids, view.KnownUserNames)
	}
	reviews := make([]publictrackapi.TimesheetsReview, 0, len(view.Reviews))
	for _, review := range view.Reviews {
		reviews = append(reviews, publictrackapi.TimesheetsReview{
			Approved:         review.Approved,
			ForceApproved:    lo.ToPtr(review.ForceApproved),
			Name:             lo.ToPtr(review.Name),
			RejectionComment: lo.ToPtr(review.RejectionComment),
			ReviewLayer:      lo.ToPtr(review.ReviewLayer),
			UpdatedAt:        lo.ToPtr(review.UpdatedAt.UTC().Format(time.RFC3339)),
			UserId:           lo.ToPtr(int(review.UserID)),
		})
	}
	permissions := []string{"view"}
	var approvedOrRejectedID *int
	if view.ApprovedOrRejectedID != nil {
		approvedOrRejectedID = lo.ToPtr(int(*view.ApprovedOrRejectedID))
	}
	var approverID *int
	if view.ApproverUserID != nil {
		approverID = lo.ToPtr(int(*view.ApproverUserID))
	}
	return publictrackapi.TimesheetsAPITimesheet{
		ApprovedOrRejectedAt:  dateTimePointer(view.ApprovedOrRejectedAt),
		ApprovedOrRejectedId:  approvedOrRejectedID,
		ApproverId:            approverID,
		ApproverName:          view.ApproverName,
		Approvers:             lo.ToPtr(approvers),
		ApproversLayers:       lo.ToPtr(approverLayers),
		EndDate:               lo.ToPtr(view.EndDate.UTC().Format("2006-01-02")),
		MemberId:              lo.ToPtr(int(view.MemberUserID)),
		MemberName:            lo.ToPtr(view.MemberName),
		PeriodEditable:        lo.ToPtr(true),
		PeriodEnd:             lo.ToPtr(view.PeriodEnd.UTC().Format("2006-01-02")),
		PeriodLocked:          lo.ToPtr(false),
		PeriodStart:           lo.ToPtr(view.PeriodStart.UTC().Format("2006-01-02")),
		Periodicity:           lo.ToPtr(view.Periodicity),
		Permissions:           lo.ToPtr(permissions),
		RejectionComment:      lo.ToPtr(view.RejectionComment),
		ReminderDay:           lo.ToPtr(publictrackapi.TimeWeekday(view.ReminderDay)),
		ReminderSentAt:        dateTimePointer(view.ReminderSentAt),
		ReminderTime:          lo.ToPtr(view.ReminderTime),
		ReviewLayer:           lo.ToPtr(view.ReviewLayer),
		Reviews:               lo.ToPtr(reviews),
		StartDate:             lo.ToPtr(view.StartDate.UTC().Format("2006-01-02")),
		Status:                lo.ToPtr(view.Status),
		SubmittedAt:           dateTimePointer(view.SubmittedAt),
		TimesheetSetupId:      lo.ToPtr(int(view.TimesheetSetupID)),
		Timezone:              lo.ToPtr(view.Timezone),
		WorkingHoursInMinutes: lo.ToPtr(view.WorkingHoursInMinutes),
		WorkspaceId:           lo.ToPtr(int(view.WorkspaceID)),
	}
}

func apiModelTimesheet(view governanceapplication.TimesheetView) publictrackapi.ModelsTimesheet {
	var approvedOrRejectedID *int
	if view.ApprovedOrRejectedID != nil {
		approvedOrRejectedID = lo.ToPtr(int(*view.ApprovedOrRejectedID))
	}
	return publictrackapi.ModelsTimesheet{
		ApprovedOrRejectedAt:  dateTimePointer(view.ApprovedOrRejectedAt),
		ApprovedOrRejectedId:  approvedOrRejectedID,
		CreatedAt:             lo.ToPtr(view.CreatedAt.UTC().Format(time.RFC3339)),
		ForceApproved:         lo.ToPtr(view.ForceApproved),
		RejectionComment:      lo.ToPtr(view.RejectionComment),
		ReminderSentAt:        dateTimePointer(view.ReminderSentAt),
		ReviewLayer:           lo.ToPtr(view.ReviewLayer),
		StartDate:             lo.ToPtr(view.StartDate.UTC().Format("2006-01-02")),
		Status:                lo.ToPtr(view.Status),
		SubmittedAt:           dateTimePointer(view.SubmittedAt),
		TimesheetId:           lo.ToPtr(int(view.ID)),
		TimesheetSetupId:      lo.ToPtr(int(view.TimesheetSetupID)),
		Timezone:              lo.ToPtr(view.Timezone),
		UpdatedAt:             lo.ToPtr(view.UpdatedAt.UTC().Format(time.RFC3339)),
		WorkingHoursInMinutes: lo.ToPtr(view.WorkingHoursInMinutes),
		WorkspaceId:           lo.ToPtr(int(view.WorkspaceID)),
	}
}

func apiAlert(view governanceapplication.AlertView) publictrackapi.ModelsAlertWithMeta {
	receiverUsers := make([]int, 0, len(view.ReceiverUsers))
	for _, id := range view.ReceiverUsers {
		receiverUsers = append(receiverUsers, int(id))
	}
	var clientID *int
	if view.ClientID != nil {
		clientID = lo.ToPtr(int(*view.ClientID))
	}
	var projectID *int
	if view.ProjectID != nil {
		projectID = lo.ToPtr(int(*view.ProjectID))
	}
	return publictrackapi.ModelsAlertWithMeta{
		ClientId:          clientID,
		ClientName:        view.ClientName,
		Id:                lo.ToPtr(int(view.ID)),
		ProjectId:         projectID,
		ProjectName:       view.ProjectName,
		ReceiverRoles:     lo.ToPtr(view.ReceiverRoles),
		ReceiverUsers:     lo.ToPtr(receiverUsers),
		ReceiverUsersName: lo.ToPtr(view.ReceiverUsersName),
		SourceKind:        lo.ToPtr(view.SourceKind),
		ThresholdType:     lo.ToPtr(view.ThresholdType),
		Thresholds:        lo.ToPtr(view.Thresholds),
		Wid:               lo.ToPtr(int(view.WorkspaceID)),
	}
}

func apiTrackedTimeEntry(view governanceapplication.TrackedTimeEntryView) publictrackapi.GithubComTogglTogglApiInternalModelsTimeEntry {
	tagIDs := make([]int, 0, len(view.TagIDs))
	for _, id := range view.TagIDs {
		tagIDs = append(tagIDs, int(id))
	}
	expenseIDs := make([]int, 0, len(view.ExpenseIDs))
	for _, id := range view.ExpenseIDs {
		expenseIDs = append(expenseIDs, int(id))
	}
	tagNames := view.TagNames
	var clientID *int
	if view.ClientID != nil {
		clientID = lo.ToPtr(int(*view.ClientID))
	}
	var projectID *int
	if view.ProjectID != nil {
		projectID = lo.ToPtr(int(*view.ProjectID))
	}
	var taskID *int
	if view.TaskID != nil {
		taskID = lo.ToPtr(int(*view.TaskID))
	}
	return publictrackapi.GithubComTogglTogglApiInternalModelsTimeEntry{
		At:          lo.ToPtr(view.UpdatedAt.UTC().Format(time.RFC3339)),
		Billable:    lo.ToPtr(view.Billable),
		ClientId:    clientID,
		ClientName:  view.ClientName,
		Description: lo.ToPtr(view.Description),
		Duration:    lo.ToPtr(view.Duration),
		ExpenseIds:  lo.ToPtr(expenseIDs),
		Id:          lo.ToPtr(int(view.ID)),
		Pid:         projectID,
		ProjectId:   projectID,
		ProjectName: view.ProjectName,
		Start:       lo.ToPtr(view.Start.UTC().Format(time.RFC3339)),
		Stop:        dateTimePointer(view.Stop),
		TagIds:      lo.ToPtr(tagIDs),
		Tags:        lo.ToPtr(tagNames),
		TaskId:      taskID,
		TaskName:    view.TaskName,
		Tid:         taskID,
		Uid:         lo.ToPtr(int(view.UserID)),
		UserId:      lo.ToPtr(int(view.UserID)),
		Wid:         lo.ToPtr(int(view.WorkspaceID)),
		WorkspaceId: lo.ToPtr(int(view.WorkspaceID)),
	}
}

func datePointer(value *time.Time) *string {
	if value == nil {
		return nil
	}
	formatted := value.UTC().Format("2006-01-02")
	return lo.ToPtr(formatted)
}

func dateTimePointer(value *time.Time) *string {
	if value == nil {
		return nil
	}
	formatted := value.UTC().Format(time.RFC3339)
	return lo.ToPtr(formatted)
}
