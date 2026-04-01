package application

import (
	"context"
	"strings"
	"time"

	"opentoggl/backend/apps/backend/internal/log"
)

type Service struct {
	store  Store
	logger log.Logger
	now    func() time.Time
}

func NewService(store Store, logger log.Logger) (*Service, error) {
	if store == nil {
		return nil, ErrStoreRequired
	}
	if logger == nil {
		return nil, ErrLoggerRequired
	}
	return &Service{
		store:  store,
		logger: logger,
		now: func() time.Time {
			return time.Now().UTC()
		},
	}, nil
}

func (service *Service) GetTimeEntryConstraints(
	ctx context.Context,
	workspaceID int64,
) (TimeEntryConstraintsView, error) {
	if workspaceID <= 0 {
		return TimeEntryConstraintsView{}, ErrInvalidWorkspace
	}
	view, err := service.store.GetTimeEntryConstraints(ctx, workspaceID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to get time entry constraints",
			"workspace_id", workspaceID,
			"error", err.Error(),
		)
		return TimeEntryConstraintsView{}, err
	}
	return view, nil
}

func (service *Service) UpdateTimeEntryConstraints(
	ctx context.Context,
	view TimeEntryConstraintsView,
) error {
	if view.WorkspaceID <= 0 {
		return ErrInvalidWorkspace
	}
	service.logger.InfoContext(ctx, "updating time entry constraints",
		"workspace_id", view.WorkspaceID,
	)
	view.TimeEntryConstraintsEnabled = view.DescriptionPresent || view.ProjectPresent || view.TagPresent || view.TaskPresent
	if err := service.store.SaveTimeEntryConstraints(ctx, view); err != nil {
		service.logger.ErrorContext(ctx, "failed to save time entry constraints",
			"workspace_id", view.WorkspaceID,
			"error", err.Error(),
		)
		return err
	}
	service.logger.InfoContext(ctx, "time entry constraints updated",
		"workspace_id", view.WorkspaceID,
	)
	return nil
}

func (service *Service) ListAlerts(ctx context.Context, workspaceID int64) ([]AlertView, error) {
	if workspaceID <= 0 {
		return nil, ErrInvalidWorkspace
	}
	views, err := service.store.ListAlerts(ctx, workspaceID)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to list alerts",
			"workspace_id", workspaceID,
			"error", err.Error(),
		)
		return nil, err
	}
	return views, nil
}

func (service *Service) SaveAlert(ctx context.Context, command SaveAlertCommand) (AlertView, error) {
	if command.WorkspaceID <= 0 {
		return AlertView{}, ErrInvalidWorkspace
	}
	service.logger.InfoContext(ctx, "saving alert",
		"workspace_id", command.WorkspaceID,
		"alert_id", command.AlertID,
	)
	command.SourceKind = strings.TrimSpace(command.SourceKind)
	command.ThresholdType = strings.TrimSpace(command.ThresholdType)
	view, err := service.store.SaveAlert(ctx, command)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to save alert",
			"workspace_id", command.WorkspaceID,
			"error", err.Error(),
		)
		return AlertView{}, err
	}
	service.logger.InfoContext(ctx, "alert saved",
		"alert_id", view.ID,
	)
	return view, nil
}

func (service *Service) DeleteAlert(ctx context.Context, workspaceID int64, alertID int64) error {
	if workspaceID <= 0 {
		return ErrInvalidWorkspace
	}
	service.logger.InfoContext(ctx, "deleting alert",
		"workspace_id", workspaceID,
		"alert_id", alertID,
	)
	if err := service.store.DeleteAlert(ctx, workspaceID, alertID); err != nil {
		service.logger.ErrorContext(ctx, "failed to delete alert",
			"workspace_id", workspaceID,
			"alert_id", alertID,
			"error", err.Error(),
		)
		return err
	}
	service.logger.InfoContext(ctx, "alert deleted",
		"workspace_id", workspaceID,
		"alert_id", alertID,
	)
	return nil
}

func (service *Service) ListTimesheetSetups(
	ctx context.Context,
	workspaceID int64,
	filter ListTimesheetSetupsFilter,
) ([]TimesheetSetupView, error) {
	if workspaceID <= 0 {
		return nil, ErrInvalidWorkspace
	}
	views, err := service.store.ListTimesheetSetups(ctx, workspaceID, filter)
	if err != nil {
		service.logger.ErrorContext(ctx, "failed to list timesheet setups",
			"workspace_id", workspaceID,
			"error", err.Error(),
		)
		return nil, err
	}
	return views, nil
}

func (service *Service) CreateTimesheetSetups(
	ctx context.Context,
	command CreateTimesheetSetupCommand,
) ([]TimesheetSetupView, error) {
	if command.WorkspaceID <= 0 {
		return nil, ErrInvalidWorkspace
	}
	command.Periodicity = normalizePeriodicity(command.Periodicity)
	command.ReminderDay = normalizeReminderDay(command.ReminderDay)
	command.ReminderTime = normalizeReminderTime(command.ReminderTime)
	if command.StartDate.IsZero() {
		command.StartDate = service.now()
	}
	command.StartDate = dateOnly(command.StartDate)
	return service.store.CreateTimesheetSetups(ctx, command)
}

func (service *Service) UpdateTimesheetSetup(
	ctx context.Context,
	command UpdateTimesheetSetupCommand,
) (TimesheetSetupView, error) {
	if command.WorkspaceID <= 0 {
		return TimesheetSetupView{}, ErrInvalidWorkspace
	}
	if command.ReminderDay != nil {
		value := normalizeReminderDay(*command.ReminderDay)
		command.ReminderDay = &value
	}
	if command.ReminderTime != nil {
		value := normalizeReminderTime(*command.ReminderTime)
		command.ReminderTime = &value
	}
	if command.EndDate != nil {
		value := dateOnly(*command.EndDate)
		command.EndDate = &value
	}
	return service.store.UpdateTimesheetSetup(ctx, command)
}

func (service *Service) DeleteTimesheetSetup(ctx context.Context, workspaceID int64, setupID int64) error {
	if workspaceID <= 0 {
		return ErrInvalidWorkspace
	}
	return service.store.DeleteTimesheetSetup(ctx, workspaceID, setupID)
}

func (service *Service) ListTimesheets(
	ctx context.Context,
	workspaceID int64,
	requesterUserID int64,
	filter ListTimesheetsFilter,
) ([]TimesheetView, error) {
	if workspaceID <= 0 {
		return nil, ErrInvalidWorkspace
	}
	filter.Page = normalizePage(filter.Page, 1)
	filter.PerPage = normalizePage(filter.PerPage, 20)

	setups, err := service.store.ListTimesheetSetups(ctx, workspaceID, ListTimesheetSetupsFilter{
		MemberUserIDs:   filter.MemberUserIDs,
		ApproverUserIDs: filter.ApproverUserIDs,
		SortField:       filter.SortField,
		SortOrder:       filter.SortOrder,
	})
	if err != nil {
		return nil, err
	}

	setupIDs := make([]int64, 0, len(setups))
	for _, setup := range setups {
		if len(filter.TimesheetSetupIDs) > 0 && !containsInt64(filter.TimesheetSetupIDs, setup.ID) {
			continue
		}
		setupIDs = append(setupIDs, setup.ID)
	}
	stored, err := service.store.ListStoredTimesheets(ctx, workspaceID, setupIDs, filter.After, filter.Before)
	if err != nil {
		return nil, err
	}
	storedByKey := map[string]TimesheetView{}
	for _, timesheet := range stored {
		storedByKey[timesheetKey(timesheet.TimesheetSetupID, timesheet.StartDate)] = timesheet
	}

	windowStart, windowEnd := listWindow(filter.After, filter.Before, service.now())
	timesheets := make([]TimesheetView, 0)
	for _, setup := range setups {
		if len(filter.TimesheetSetupIDs) > 0 && !containsInt64(filter.TimesheetSetupIDs, setup.ID) {
			continue
		}
		for _, periodStart := range listPeriodStarts(setup, windowStart, windowEnd) {
			key := timesheetKey(setup.ID, periodStart)
			timesheet, ok := storedByKey[key]
			if !ok {
				timesheet = buildSyntheticTimesheet(setup, periodStart)
			}
			timesheet.WorkingHoursInMinutes = workingMinutes(timesheet.StartDate, timesheet.EndDate)
			if len(filter.Statuses) > 0 && !containsString(filter.Statuses, timesheet.Status) {
				continue
			}
			timesheet = withPermissions(requesterUserID, timesheet)
			timesheets = append(timesheets, timesheet)
		}
	}
	return paginateTimesheets(timesheets, filter.Page, filter.PerPage), nil
}

func (service *Service) UpdateTimesheet(
	ctx context.Context,
	command UpdateTimesheetCommand,
) (TimesheetView, error) {
	if command.WorkspaceID <= 0 {
		return TimesheetView{}, ErrInvalidWorkspace
	}
	setup, ok, err := service.store.GetTimesheetSetup(ctx, command.WorkspaceID, command.TimesheetSetupID)
	if err != nil {
		return TimesheetView{}, err
	}
	if !ok {
		return TimesheetView{}, ErrTimesheetSetupNotFound
	}

	command.StartDate = dateOnly(command.StartDate)
	recordStart := alignPeriodStart(setup, command.StartDate)
	key := timesheetKey(setup.ID, recordStart)
	stored, err := service.store.ListStoredTimesheets(ctx, command.WorkspaceID, []int64{setup.ID}, &recordStart, &recordStart)
	if err != nil {
		return TimesheetView{}, err
	}
	current := buildSyntheticTimesheet(setup, recordStart)
	for _, view := range stored {
		if timesheetKey(view.TimesheetSetupID, view.StartDate) == key {
			current = view
			break
		}
	}

	current.Status = normalizeTimesheetStatus(command.Status)
	if command.ForceApproved != nil {
		current.ForceApproved = *command.ForceApproved
	}
	if command.RejectionComment != nil {
		current.RejectionComment = strings.TrimSpace(*command.RejectionComment)
	}
	now := service.now()
	current.UpdatedAt = now
	switch current.Status {
	case "submitted":
		current.SubmittedAt = &now
	case "approved", "rejected", "reopened":
		current.ApprovedOrRejectedAt = &now
		current.ApprovedOrRejectedID = &command.RequesterUserID
		current.ReviewLayer++
	}
	current.Reviews = append(current.Reviews, TimesheetReviewView{
		Approved:         reviewApprovedPointer(current.Status),
		ForceApproved:    current.ForceApproved,
		Name:             reviewerName(command.RequesterUserID, current),
		ReviewLayer:      current.ReviewLayer,
		RejectionComment: current.RejectionComment,
		UpdatedAt:        now,
		UserID:           command.RequesterUserID,
	})
	current = withPermissions(command.RequesterUserID, current)
	return service.store.SaveTimesheet(ctx, current)
}

func (service *Service) GetTimesheetHours(
	ctx context.Context,
	workspaceID int64,
	setupID int64,
	startDate time.Time,
) (TimesheetHoursView, error) {
	setup, ok, err := service.store.GetTimesheetSetup(ctx, workspaceID, setupID)
	if err != nil {
		return TimesheetHoursView{}, err
	}
	if !ok {
		return TimesheetHoursView{}, ErrTimesheetSetupNotFound
	}
	startDate = alignPeriodStart(setup, startDate)
	endDate := periodEnd(setup, startDate)
	entries, err := service.store.ListPeriodTimeEntries(ctx, workspaceID, setup.MemberUserID, startDate, endDate)
	if err != nil {
		return TimesheetHoursView{}, err
	}
	total := 0
	for _, entry := range entries {
		total += entry.Duration
	}
	return TimesheetHoursView{
		StartDate:             startDate,
		TimesheetSetupID:      setup.ID,
		TotalSeconds:          total,
		WorkingHoursInMinutes: workingMinutes(startDate, endDate),
	}, nil
}

func (service *Service) GetTimesheetTimeEntries(
	ctx context.Context,
	workspaceID int64,
	setupID int64,
	startDate time.Time,
) ([]TrackedTimeEntryView, error) {
	setup, ok, err := service.store.GetTimesheetSetup(ctx, workspaceID, setupID)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrTimesheetSetupNotFound
	}
	startDate = alignPeriodStart(setup, startDate)
	return service.store.ListPeriodTimeEntries(ctx, workspaceID, setup.MemberUserID, startDate, periodEnd(setup, startDate))
}

func normalizePage(value int, fallback int) int {
	if value <= 0 {
		return fallback
	}
	return value
}
