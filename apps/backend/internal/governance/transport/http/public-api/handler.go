package publicapi

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	governanceapplication "opentoggl/backend/apps/backend/internal/governance/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

type auditLogResponse struct {
	ID             int64  `json:"id"`
	OrganizationID int64  `json:"organization_id"`
	WorkspaceID    *int64 `json:"workspace_id,omitempty"`
	EntityType     string `json:"entity_type"`
	EntityID       *int64 `json:"entity_id,omitempty"`
	Action         string `json:"action"`
	UserID         *int64 `json:"user_id,omitempty"`
	Source         string `json:"source"`
	RequestBody    string `json:"request_body"`
	ResponseBody   string `json:"response_body"`
	CreatedAt      string `json:"created_at"`
}

func (handler *Handler) GetPublicTrackAuditLogs(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid organization_id")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}

	from, err := parseRFC3339(ctx.Param("from"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid from date: "+err.Error())
	}
	to, err := parseRFC3339(ctx.Param("to"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "invalid to date: "+err.Error())
	}

	filter := governanceapplication.ListAuditLogsFilter{
		From:       from,
		To:         to,
		Export:     lo.FromPtr(queryBoolPointer(ctx, "export")),
		EntityType: ctx.QueryParam("entity_type"),
		Action:     ctx.QueryParam("action"),
		Source:     ctx.QueryParam("source"),
		PageSize:   queryInt(ctx, "page_size", 50),
		PageNumber: queryInt(ctx, "page_number", 1),
	}
	if workspaceID, ok := optionalQueryInt64(ctx, "workspace_id"); ok {
		filter.WorkspaceID = lo.ToPtr(workspaceID)
	}
	if entityID, ok := optionalQueryInt64(ctx, "entity_id"); ok {
		filter.EntityID = lo.ToPtr(entityID)
	}
	if userID, ok := optionalQueryInt64(ctx, "user_id"); ok {
		filter.UserID = lo.ToPtr(userID)
	}

	logs, err := handler.governance.ListAuditLogs(ctx.Request().Context(), organizationID, filter)
	if err != nil {
		return writeGovernanceError(err)
	}

	response := make([]auditLogResponse, 0, len(logs))
	for _, log := range logs {
		response = append(response, auditLogResponse{
			ID:             log.ID,
			OrganizationID: log.OrganizationID,
			WorkspaceID:    log.WorkspaceID,
			EntityType:     log.EntityType,
			EntityID:       log.EntityID,
			Action:         log.Action,
			UserID:         log.UserID,
			Source:         log.Source,
			RequestBody:    log.RequestBody,
			ResponseBody:   log.ResponseBody,
			CreatedAt:      log.CreatedAt.UTC().Format(time.RFC3339),
		})
	}
	return ctx.JSON(http.StatusOK, response)
}

func (handler *Handler) GetPublicTrackTimeEntryConstraints(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	view, err := handler.governance.GetTimeEntryConstraints(ctx.Request().Context(), workspaceID)
	if err != nil {
		return writeGovernanceError(err)
	}
	return ctx.JSON(http.StatusOK, publictrackapi.ModelsTimeEntryConstraints{
		DescriptionPresent:          lo.ToPtr(view.DescriptionPresent),
		ProjectPresent:              lo.ToPtr(view.ProjectPresent),
		TagPresent:                  lo.ToPtr(view.TagPresent),
		TaskPresent:                 lo.ToPtr(view.TaskPresent),
		TimeEntryConstraintsEnabled: lo.ToPtr(view.TimeEntryConstraintsEnabled),
	})
}

func (handler *Handler) PostPublicTrackTimeEntryConstraints(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	var payload publictrackapi.ModelsTimeEntryConstraints
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	err := handler.governance.UpdateTimeEntryConstraints(ctx.Request().Context(), governanceapplication.TimeEntryConstraintsView{
		WorkspaceID:        workspaceID,
		DescriptionPresent: lo.FromPtr(payload.DescriptionPresent),
		ProjectPresent:     lo.FromPtr(payload.ProjectPresent),
		TagPresent:         lo.FromPtr(payload.TagPresent),
		TaskPresent:        lo.FromPtr(payload.TaskPresent),
	})
	if err != nil {
		return writeGovernanceError(err)
	}
	return ctx.JSON(http.StatusOK, publictrackapi.WorkspacesJSONResult{
		Wid: lo.ToPtr(int(workspaceID)),
	})
}

func (handler *Handler) GetPublicTrackAlerts(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	alerts, err := handler.governance.ListAlerts(ctx.Request().Context(), workspaceID)
	if err != nil {
		return writeGovernanceError(err)
	}
	response := make([]publictrackapi.ModelsAlertWithMeta, 0, len(alerts))
	for _, alert := range alerts {
		response = append(response, apiAlert(alert))
	}
	return ctx.JSON(http.StatusOK, response)
}

func (handler *Handler) PostPublicTrackAlerts(ctx echo.Context) error {
	return handler.saveAlert(ctx, nil)
}

func (handler *Handler) PutPublicTrackAlerts(ctx echo.Context) error {
	alertID, ok := parsePathID(ctx, "alert_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	return handler.saveAlert(ctx, &alertID)
}

func (handler *Handler) DeletePublicTrackAlerts(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	alertID, ok := parsePathID(ctx, "alert_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	if err := handler.governance.DeleteAlert(ctx.Request().Context(), workspaceID, alertID); err != nil {
		return writeGovernanceError(err)
	}
	return ctx.JSON(http.StatusOK, "OK")
}

func (handler *Handler) GetPublicTrackTimesheetSetups(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	setups, err := handler.governance.ListTimesheetSetups(ctx.Request().Context(), workspaceID, governanceapplication.ListTimesheetSetupsFilter{
		MemberUserIDs:   parseCSVInt64s(ctx.QueryParam("member_ids")),
		ApproverUserIDs: parseCSVInt64s(ctx.QueryParam("approver_ids")),
		SortField:       ctx.QueryParam("sort_field"),
		SortOrder:       ctx.QueryParam("sort_order"),
	})
	if err != nil {
		return writeGovernanceError(err)
	}
	response := make([]publictrackapi.TimesheetsetupsAPITimesheetSetup, 0, len(setups))
	for _, setup := range setups {
		response = append(response, apiTimesheetSetup(setup))
	}
	return ctx.JSON(http.StatusOK, publictrackapi.TimesheetsetupsGetPaginatedResponse{
		Data: lo.ToPtr(response),
	})
}

func (handler *Handler) PostPublicTrackTimesheetSetups(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	var payload publictrackapi.TimesheetsetupsCreatePayload
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	startDate := time.Now().UTC()
	if payload.StartDate != nil && *payload.StartDate != "" {
		parsed, err := parseDate(*payload.StartDate)
		if err != nil {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		startDate = parsed
	}
	var approverUserID *int64
	if payload.ApproverId != nil {
		approverUserID = lo.ToPtr(int64(*payload.ApproverId))
	}
	setups, err := handler.governance.CreateTimesheetSetups(ctx.Request().Context(), governanceapplication.CreateTimesheetSetupCommand{
		WorkspaceID:          workspaceID,
		MemberUserIDs:        intsToInt64s(lo.FromPtr(payload.MemberIds)),
		ApproverUserID:       approverUserID,
		ApproverUserIDs:      intsToInt64s(lo.FromPtr(payload.ApproverIds)),
		ApproverLayers:       approverLayerPayload(payload.ApproversLayers),
		Periodicity:          lo.FromPtr(payload.Periodicity),
		ReminderDay:          int(lo.FromPtr(payload.ReminderDay)),
		ReminderTime:         lo.FromPtr(payload.ReminderTime),
		EmailReminderEnabled: lo.FromPtr(payload.EmailReminderEnabled),
		SlackReminderEnabled: lo.FromPtr(payload.SlackReminderEnabled),
		StartDate:            startDate,
	})
	if err != nil {
		return writeGovernanceError(err)
	}
	response := make([]publictrackapi.TimesheetsetupsAPITimesheetSetup, 0, len(setups))
	for _, setup := range setups {
		response = append(response, apiTimesheetSetup(setup))
	}
	return ctx.JSON(http.StatusOK, response)
}

func (handler *Handler) PutPublicTrackTimesheetSetups(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	setupID, ok := parsePathID(ctx, "setup_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	var payload publictrackapi.TimesheetsetupsUpdatePayload
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	var endDate *time.Time
	if payload.EndDate != nil && *payload.EndDate != "" {
		parsed, err := parseDate(*payload.EndDate)
		if err != nil {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		endDate = &parsed
	}
	var approverUserID *int64
	if payload.ApproverId != nil {
		approverUserID = lo.ToPtr(int64(*payload.ApproverId))
	}
	var reminderDay *int
	if payload.ReminderDay != nil {
		reminderDay = lo.ToPtr(int(*payload.ReminderDay))
	}
	view, err := handler.governance.UpdateTimesheetSetup(ctx.Request().Context(), governanceapplication.UpdateTimesheetSetupCommand{
		WorkspaceID:          workspaceID,
		SetupID:              setupID,
		ApproverUserID:       approverUserID,
		ApproverUserIDs:      intsToInt64s(lo.FromPtr(payload.ApproverIds)),
		ApproverLayers:       approverLayerPayload(payload.ApproversLayers),
		ReminderDay:          reminderDay,
		ReminderTime:         payload.ReminderTime,
		EmailReminderEnabled: payload.EmailReminderEnabled,
		SlackReminderEnabled: payload.SlackReminderEnabled,
		EndDate:              endDate,
	})
	if err != nil {
		return writeGovernanceError(err)
	}
	return ctx.JSON(http.StatusOK, apiTimesheetSetup(view))
}

func (handler *Handler) DeletePublicTrackTimesheetSetups(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	setupID, ok := parsePathID(ctx, "setup_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	if err := handler.governance.DeleteTimesheetSetup(ctx.Request().Context(), workspaceID, setupID); err != nil {
		return writeGovernanceError(err)
	}
	return ctx.JSON(http.StatusOK, "OK")
}

func (handler *Handler) GetPublicTrackTimesheets(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	requester, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	timesheets, err := handler.governance.ListTimesheets(ctx.Request().Context(), workspaceID, requester.ID, governanceapplication.ListTimesheetsFilter{
		MemberUserIDs:     parseCSVInt64s(ctx.QueryParam("member_ids")),
		ApproverUserIDs:   parseCSVInt64s(ctx.QueryParam("approver_ids")),
		TimesheetSetupIDs: parseCSVInt64s(ctx.QueryParam("timesheet_setup_ids")),
		Statuses:          parseCSVStrings(ctx.QueryParam("statuses")),
		After:             parseOptionalDate(ctx.QueryParam("after")),
		Before:            parseOptionalDate(ctx.QueryParam("before")),
		Page:              queryInt(ctx, "page", 1),
		PerPage:           queryInt(ctx, "per_page", 20),
		SortField:         ctx.QueryParam("sort_field"),
		SortOrder:         ctx.QueryParam("sort_order"),
	})
	if err != nil {
		return writeGovernanceError(err)
	}
	response := make([]publictrackapi.TimesheetsAPITimesheet, 0, len(timesheets))
	for _, timesheet := range timesheets {
		response = append(response, apiTimesheet(timesheet))
	}
	return ctx.JSON(http.StatusOK, []publictrackapi.TimesheetsGetPaginatedResponse{{
		Data:       lo.ToPtr(response),
		Page:       lo.ToPtr(queryInt(ctx, "page", 1)),
		PerPage:    lo.ToPtr(queryInt(ctx, "per_page", 20)),
		TotalCount: lo.ToPtr(len(response)),
	}})
}

func (handler *Handler) GetPublicTrackMeTimesheets(ctx echo.Context) error {
	requester, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	_, workspaceID, err := handler.scope.RequirePublicTrackHome(ctx)
	if err != nil {
		return err
	}
	timesheets, err := handler.governance.ListTimesheets(ctx.Request().Context(), workspaceID, requester.ID, governanceapplication.ListTimesheetsFilter{
		MemberUserIDs: []int64{requester.ID},
		Page:          1,
		PerPage:       200,
	})
	if err != nil {
		return writeGovernanceError(err)
	}
	response := make([]publictrackapi.ModelsTimesheet, 0, len(timesheets))
	for _, timesheet := range timesheets {
		response = append(response, apiModelTimesheet(timesheet))
	}
	return ctx.JSON(http.StatusOK, response)
}

func optionalQueryInt64(ctx echo.Context, key string) (int64, bool) {
	value := strings.TrimSpace(ctx.QueryParam(key))
	if value == "" {
		return 0, false
	}
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return 0, false
	}
	return parsed, true
}

func queryBoolPointer(ctx echo.Context, key string) *bool {
	value := strings.TrimSpace(ctx.QueryParam(key))
	if value == "" {
		return nil
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return nil
	}
	return lo.ToPtr(parsed)
}

func (handler *Handler) PutPublicTrackTimesheetsBatch(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	requester, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	var payload publictrackapi.TimesheetsPutBatchTimesheetPayload
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if payload.StartDate == nil || payload.TimesheetSetupId == nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	startDate, err := parseDate(*payload.StartDate)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	view, err := handler.governance.UpdateTimesheet(ctx.Request().Context(), governanceapplication.UpdateTimesheetCommand{
		WorkspaceID:      workspaceID,
		RequesterUserID:  requester.ID,
		TimesheetSetupID: int64(*payload.TimesheetSetupId),
		StartDate:        startDate,
		Status:           lo.FromPtr(payload.Status),
		ForceApproved:    payload.ForceApproved,
		RejectionComment: payload.RejectionComment,
	})
	if err != nil {
		return writeGovernanceError(err)
	}
	return ctx.JSON(http.StatusOK, apiTimesheet(view))
}

func (handler *Handler) GetPublicTrackTimesheetHours(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	var payload publictrackapi.TimesheetsPostTimesheetHoursPayload
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if payload.StartDate == nil || payload.TimesheetSetupId == nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	startDate, err := parseDate(*payload.StartDate)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	view, err := handler.governance.GetTimesheetHours(ctx.Request().Context(), workspaceID, int64(*payload.TimesheetSetupId), startDate)
	if err != nil {
		return writeGovernanceError(err)
	}
	return ctx.JSON(http.StatusOK, []publictrackapi.TimesheetsTimesheetHoursResponse{{
		StartDate:             lo.ToPtr(view.StartDate.UTC().Format("2006-01-02")),
		TimesheetSetupId:      lo.ToPtr(int(view.TimesheetSetupID)),
		TotalSeconds:          lo.ToPtr(view.TotalSeconds),
		WorkingHoursInMinutes: lo.ToPtr(view.WorkingHoursInMinutes),
	}})
}

func (handler *Handler) PutPublicTrackTimesheet(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	setupID, ok := parsePathID(ctx, "setup_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	startDate, err := parseDate(ctx.Param("start_date"))
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	requester, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	var payload publictrackapi.TimesheetsPutTimesheetPayload
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	view, err := handler.governance.UpdateTimesheet(ctx.Request().Context(), governanceapplication.UpdateTimesheetCommand{
		WorkspaceID:      workspaceID,
		RequesterUserID:  requester.ID,
		TimesheetSetupID: setupID,
		StartDate:        startDate,
		Status:           lo.FromPtr(payload.Status),
		ForceApproved:    payload.ForceApproved,
		RejectionComment: payload.RejectionComment,
	})
	if err != nil {
		return writeGovernanceError(err)
	}
	return ctx.JSON(http.StatusOK, apiTimesheet(view))
}

func (handler *Handler) GetPublicTrackTimesheetHistory(ctx echo.Context) error {
	return handler.GetPublicTrackTimesheetTimeEntries(ctx)
}

func (handler *Handler) GetPublicTrackTimesheetTimeEntries(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	setupID, ok := parsePathID(ctx, "setup_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	startDate, err := parseDate(ctx.Param("start_date"))
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	entries, err := handler.governance.GetTimesheetTimeEntries(ctx.Request().Context(), workspaceID, setupID, startDate)
	if err != nil {
		return writeGovernanceError(err)
	}
	response := make([]publictrackapi.GithubComTogglTogglApiInternalModelsTimeEntry, 0, len(entries))
	for _, entry := range entries {
		response = append(response, apiTrackedTimeEntry(entry))
	}
	return ctx.JSON(http.StatusOK, response)
}

func (handler *Handler) saveAlert(ctx echo.Context, alertID *int64) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	var payload struct {
		ProjectId     *int      `json:"project_id"`
		ReceiverRoles *[]string `json:"receiver_roles"`
		ReceiverUsers *[]int    `json:"receiver_users"`
		SourceKind    *string   `json:"source_kind"`
		ThresholdType *string   `json:"threshold_type"`
		Thresholds    *[]int    `json:"thresholds"`
	}
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	var projectID *int64
	if payload.ProjectId != nil {
		projectID = lo.ToPtr(int64(*payload.ProjectId))
	}
	view, err := handler.governance.SaveAlert(ctx.Request().Context(), governanceapplication.SaveAlertCommand{
		WorkspaceID:   workspaceID,
		AlertID:       alertID,
		ProjectID:     projectID,
		ReceiverRoles: lo.FromPtr(payload.ReceiverRoles),
		ReceiverUsers: intsToInt64s(lo.FromPtr(payload.ReceiverUsers)),
		SourceKind:    lo.FromPtr(payload.SourceKind),
		ThresholdType: lo.FromPtr(payload.ThresholdType),
		Thresholds:    lo.FromPtr(payload.Thresholds),
	})
	if err != nil {
		return writeGovernanceError(err)
	}
	return ctx.JSON(http.StatusOK, apiAlert(view))
}

func parseOptionalDate(value string) *time.Time {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	parsed, err := parseDate(value)
	if err != nil {
		return nil
	}
	return &parsed
}

func queryInt(ctx echo.Context, key string, fallback int) int {
	value := strings.TrimSpace(ctx.QueryParam(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil || parsed <= 0 {
		return fallback
	}
	return parsed
}

func intsToInt64s(values []int) []int64 {
	converted := make([]int64, 0, len(values))
	for _, value := range values {
		converted = append(converted, int64(value))
	}
	return converted
}

func approverLayerPayload(value *map[string][]int) map[string][]int64 {
	if value == nil {
		return nil
	}
	converted := make(map[string][]int64, len(*value))
	for layer, ids := range *value {
		converted[layer] = intsToInt64s(ids)
	}
	return converted
}
