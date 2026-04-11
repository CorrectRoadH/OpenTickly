package publicapi

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	billingapplication "opentoggl/backend/apps/backend/internal/billing/application"
	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	governanceapplication "opentoggl/backend/apps/backend/internal/governance/application"
	importapi "opentoggl/backend/apps/backend/internal/http/generated/import"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	importingapplication "opentoggl/backend/apps/backend/internal/importing/application"
	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"
	reportsapplication "opentoggl/backend/apps/backend/internal/reports/application"
	tenantapplication "opentoggl/backend/apps/backend/internal/tenant/application"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

type ScopeAuthorizer interface {
	RequirePublicTrackUser(ctx echo.Context) (*identityapplication.UserSnapshot, error)
	RequirePublicTrackWorkspace(ctx echo.Context, workspaceID int64) error
}

type OrganizationCreator interface {
	CreateOrganization(
		ctx context.Context,
		command tenantapplication.CreateOrganizationCommand,
	) (tenantapplication.CreateOrganizationResult, error)
}

type WorkspaceOwnerEnsurer interface {
	EnsureWorkspaceOwner(
		ctx context.Context,
		command membershipapplication.EnsureWorkspaceOwnerCommand,
	) (membershipapplication.WorkspaceMemberView, error)
}

type UserHomeRepository interface {
	Save(ctx context.Context, userID int64, organizationID int64, workspaceID int64) error
}

type CatalogQueries interface {
	ListClients(ctx context.Context, workspaceID int64, filter catalogapplication.ListClientsFilter) ([]catalogapplication.ClientView, error)
	ListProjects(ctx context.Context, workspaceID int64, filter catalogapplication.ListProjectsFilter) ([]catalogapplication.ProjectView, error)
	ListTags(ctx context.Context, workspaceID int64, filter catalogapplication.ListTagsFilter) ([]catalogapplication.TagView, error)
	ListTasks(ctx context.Context, workspaceID int64, filter catalogapplication.ListTasksFilter) (catalogapplication.TaskPage, error)
	ListProjectUsers(ctx context.Context, workspaceID int64, filter catalogapplication.ListProjectUsersFilter) ([]catalogapplication.ProjectUserView, error)
	ListGroups(ctx context.Context, organizationID int64) ([]catalogapplication.GroupView, error)
}

type MembershipQueries interface {
	ListWorkspaceMembers(ctx context.Context, workspaceID int64, requestedBy int64) ([]membershipapplication.WorkspaceMemberView, error)
}

type GovernanceQueries interface {
	ListAlerts(ctx context.Context, workspaceID int64) ([]governanceapplication.AlertView, error)
}

type TrackingQueries interface {
	ListReminders(ctx context.Context, workspaceID int64) ([]trackingapplication.ReminderView, error)
}

type ReportsQueries interface {
	ListSavedReports(ctx context.Context, workspaceID int64) ([]reportsapplication.SavedReportView, error)
	ListScheduledReports(ctx context.Context, workspaceID int64) ([]reportsapplication.ScheduledReportView, error)
}

type InvoiceQueries interface {
	ListInvoices(ctx context.Context, workspaceID int64, filter billingapplication.ListInvoicesFilter) ([]billingapplication.InvoiceView, error)
}

type WorkspaceQueries interface {
	GetWorkspace(ctx context.Context, workspaceID tenantdomain.WorkspaceID) (tenantapplication.WorkspaceView, error)
}

type Handler struct {
	importing  *importingapplication.Service
	catalog    CatalogQueries
	membership MembershipQueries
	governance GovernanceQueries
	tracking   TrackingQueries
	reports    ReportsQueries
	invoices   InvoiceQueries
	workspace  WorkspaceQueries
	homes      UserHomeRepository
	members    WorkspaceOwnerEnsurer
	scope      ScopeAuthorizer
	tenant     OrganizationCreator
}

func NewHandler(
	importing *importingapplication.Service,
	scope ScopeAuthorizer,
	tenant OrganizationCreator,
	members WorkspaceOwnerEnsurer,
	homes UserHomeRepository,
	catalog CatalogQueries,
	membership MembershipQueries,
	governance GovernanceQueries,
	tracking TrackingQueries,
	reports ReportsQueries,
	invoices InvoiceQueries,
	workspace WorkspaceQueries,
) *Handler {
	return &Handler{
		importing:  importing,
		catalog:    catalog,
		membership: membership,
		governance: governance,
		tracking:   tracking,
		reports:    reports,
		invoices:   invoices,
		workspace:  workspace,
		homes:      homes,
		members:    members,
		scope:      scope,
		tenant:     tenant,
	}
}

func (handler *Handler) GetPublicTrackMeExport(ctx echo.Context) error {
	user, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	exports, err := handler.importing.ListUserExports(ctx.Request().Context(), user.ID)
	if err != nil {
		return writeImportingError(err)
	}
	return ctx.JSON(http.StatusOK, exportRecordsBody(exports))
}

func (handler *Handler) PostPublicTrackMeExport(ctx echo.Context) error {
	user, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	var payload publictrackapi.ExportPayload
	if err := ctx.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	token, err := handler.importing.StartUserExport(ctx.Request().Context(), user.ID, importingapplication.UserExportSelection{
		Profile:  lo.FromPtr(payload.Profile),
		Timeline: lo.FromPtr(payload.Timeline),
	})
	if err != nil {
		return writeImportingError(err)
	}
	return ctx.JSON(http.StatusOK, token)
}

func (handler *Handler) GetPublicTrackMeExportArchive(ctx echo.Context, token string) error {
	user, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	archive, err := handler.importing.GetUserExportArchive(ctx.Request().Context(), user.ID, token)
	if err != nil {
		return writeImportingError(err)
	}
	ctx.Response().Header().Set(echo.HeaderContentDisposition, `attachment; filename="`+archive.Filename+`"`)
	return ctx.Blob(http.StatusOK, "application/zip", archive.Content)
}

func (handler *Handler) GetPublicTrackWorkspaceExports(ctx echo.Context, workspaceID int64) error {
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	exports, err := handler.importing.ListWorkspaceExports(ctx.Request().Context(), workspaceID)
	if err != nil {
		return writeImportingError(err)
	}
	return ctx.JSON(http.StatusOK, exportRecordsBody(exports))
}

func (handler *Handler) PostPublicTrackWorkspaceExports(ctx echo.Context, workspaceID int64) error {
	user, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	var payload []string
	if err := ctx.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	data, err := handler.collectWorkspaceExportData(ctx.Request().Context(), workspaceID, user.ID, payload)
	if err != nil {
		return writeImportingError(err)
	}
	token, err := handler.importing.StartWorkspaceExportWithData(ctx.Request().Context(), workspaceID, user.ID, payload, data)
	if err != nil {
		return writeImportingError(err)
	}
	return ctx.JSON(http.StatusOK, token)
}

func (handler *Handler) collectWorkspaceExportData(
	ctx context.Context,
	workspaceID int64,
	requestedBy int64,
	objects []string,
) (importingapplication.WorkspaceExportData, error) {
	objectSet := make(map[string]bool, len(objects))
	for _, o := range objects {
		objectSet[strings.TrimSpace(strings.ToLower(o))] = true
	}

	var data importingapplication.WorkspaceExportData

	if objectSet["clients"] {
		clients, err := handler.catalog.ListClients(ctx, workspaceID, catalogapplication.ListClientsFilter{
			Status: catalogapplication.ClientStatusBoth,
		})
		if err != nil {
			return data, err
		}
		data.Clients = make([]importingapplication.ImportedClient, len(clients))
		for i, c := range clients {
			data.Clients[i] = clientViewToImported(c)
		}
	}

	if objectSet["projects"] {
		projects, err := handler.catalog.ListProjects(ctx, workspaceID, catalogapplication.ListProjectsFilter{
			Page:    1,
			PerPage: 5000,
		})
		if err != nil {
			return data, err
		}
		data.Projects = make([]importingapplication.ImportedProject, len(projects))
		for i, p := range projects {
			data.Projects[i] = projectViewToImported(p)
		}
	}

	if objectSet["tags"] {
		tags, err := handler.catalog.ListTags(ctx, workspaceID, catalogapplication.ListTagsFilter{
			Page:    1,
			PerPage: 5000,
		})
		if err != nil {
			return data, err
		}
		data.Tags = make([]importingapplication.ImportedTag, len(tags))
		for i, t := range tags {
			data.Tags[i] = tagViewToImported(t)
		}
	}

	if objectSet["team"] || objectSet["workspace_users"] {
		members, err := handler.membership.ListWorkspaceMembers(ctx, workspaceID, requestedBy)
		if err != nil {
			return data, err
		}
		data.WorkspaceUsers = make([]importingapplication.ImportedWorkspaceUser, len(members))
		for i, m := range members {
			data.WorkspaceUsers[i] = workspaceMemberViewToImported(m)
		}
	}

	if objectSet["projects_users"] {
		projectUsers, err := handler.catalog.ListProjectUsers(ctx, workspaceID, catalogapplication.ListProjectUsersFilter{})
		if err != nil {
			return data, err
		}
		data.ProjectUsers = make([]importingapplication.ImportedProjectUser, len(projectUsers))
		for i, pu := range projectUsers {
			data.ProjectUsers[i] = projectUserViewToImported(pu)
		}
	}

	if objectSet["project_tasks"] {
		taskPage, err := handler.catalog.ListTasks(ctx, workspaceID, catalogapplication.ListTasksFilter{
			IncludeAll: true,
			Page:       1,
			PerPage:    5000,
		})
		if err != nil {
			return data, err
		}
		data.Tasks, _ = json.Marshal(taskPage.Tasks)
	}

	if objectSet["teams"] {
		ws, err := handler.workspace.GetWorkspace(ctx, tenantdomain.WorkspaceID(workspaceID))
		if err != nil {
			return data, err
		}
		groups, err := handler.catalog.ListGroups(ctx, int64(ws.OrganizationID))
		if err != nil {
			return data, err
		}
		data.Teams, _ = json.Marshal(groups)
	}

	if objectSet["workspace_settings"] {
		ws, err := handler.workspace.GetWorkspace(ctx, tenantdomain.WorkspaceID(workspaceID))
		if err != nil {
			return data, err
		}
		data.WorkspaceSettings, _ = json.Marshal(ws)
	}

	if objectSet["alerts"] {
		alerts, err := handler.governance.ListAlerts(ctx, workspaceID)
		if err != nil {
			return data, err
		}
		data.Alerts, _ = json.Marshal(alerts)
	}

	if objectSet["custom_reports"] {
		reports, err := handler.reports.ListSavedReports(ctx, workspaceID)
		if err != nil {
			return data, err
		}
		data.CustomReports, _ = json.Marshal(reports)
	}

	if objectSet["scheduled_reports"] {
		reports, err := handler.reports.ListScheduledReports(ctx, workspaceID)
		if err != nil {
			return data, err
		}
		data.ScheduledReports, _ = json.Marshal(reports)
	}

	if objectSet["tracking_reminders"] {
		reminders, err := handler.tracking.ListReminders(ctx, workspaceID)
		if err != nil {
			return data, err
		}
		data.TrackingReminders, _ = json.Marshal(reminders)
	}

	if objectSet["invoices"] {
		invoices, err := handler.invoices.ListInvoices(ctx, workspaceID, billingapplication.ListInvoicesFilter{})
		if err != nil {
			return data, err
		}
		data.Invoices, _ = json.Marshal(invoices)
	}

	return data, nil
}

func (handler *Handler) GetPublicTrackWorkspaceExportArchive(
	ctx echo.Context,
	workspaceID int64,
	token string,
) error {
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	archive, err := handler.importing.GetWorkspaceExportArchive(ctx.Request().Context(), workspaceID, token)
	if err != nil {
		return writeImportingError(err)
	}
	ctx.Response().Header().Set(echo.HeaderContentDisposition, `attachment; filename="`+archive.Filename+`"`)
	return ctx.Blob(http.StatusOK, "application/zip", archive.Content)
}

func (handler *Handler) CreateImportJob(ctx echo.Context) error {
	user, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	source, err := parseRequiredStringField(ctx.FormValue("source"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	uploadedFile, err := ctx.FormFile("archive")
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	fileReader, err := uploadedFile.Open()
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	defer fileReader.Close()

	archiveContent, err := io.ReadAll(fileReader)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	switch source {
	case importingapplication.ImportSourceTogglExportArchive:
		return handler.createArchiveImportJob(ctx, *user, archiveContent, source)
	case importingapplication.ImportSourceTimeEntriesCSV:
		return handler.createTimeEntriesImportJob(ctx, user.ID, archiveContent, source)
	default:
		return writeImportingError(importingapplication.ErrImportSourceInvalid)
	}
}

func (handler *Handler) GetImportJob(ctx echo.Context, jobID string) error {
	job, err := handler.importing.GetImportJob(ctx.Request().Context(), jobID)
	if err != nil {
		return writeImportingError(err)
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, job.WorkspaceID); err != nil {
		return err
	}
	return ctx.JSON(http.StatusOK, importJobBody(job))
}

func exportRecordsBody(records []importingapplication.ExportRecordView) []publictrackapi.ModelsDownloadRequestRecord {
	response := make([]publictrackapi.ModelsDownloadRequestRecord, 0, len(records))
	for _, record := range records {
		response = append(response, publictrackapi.ModelsDownloadRequestRecord{
			ErrorMessage: optionalString(record.ErrorMessage),
			State:        lo.ToPtr(record.State),
			Token:        lo.ToPtr(record.Token),
		})
	}
	return response
}

func optionalString(value string) *string {
	if value == "" {
		return nil
	}
	return lo.ToPtr(value)
}

func importJobBody(job importingapplication.ImportJobView) importapi.ImportJob {
	return importapi.ImportJob{
		ErrorMessage: optionalString(job.ErrorMessage),
		JobId:        job.JobID,
		Status:       importapi.ImportJobStatus(job.Status),
		WorkspaceId:  int(job.WorkspaceID),
	}
}

func importJobBodyWithOrganization(job importingapplication.ImportJobView, organizationID int) importapi.ImportJob {
	body := importJobBody(job)
	body.OrganizationId = lo.ToPtr(organizationID)
	return body
}

func parseRequiredStringField(value string) (string, error) {
	normalized := strings.TrimSpace(value)
	if normalized == "" {
		return "", errors.New("value is required")
	}
	return normalized, nil
}

func parseInt64Field(value string) (int64, error) {
	normalized := strings.TrimSpace(value)
	if normalized == "" {
		return 0, errors.New("value is required")
	}
	parsed, err := strconv.ParseInt(normalized, 10, 64)
	if err != nil {
		return 0, err
	}
	return parsed, nil
}

func defaultImportedWorkspaceName(user identityapplication.UserSnapshot) string {
	if strings.TrimSpace(user.FullName) == "" {
		return "My workspace"
	}
	return strings.TrimSpace(user.FullName) + "'s workspace"
}

func (handler *Handler) createArchiveImportJob(
	ctx echo.Context,
	user identityapplication.UserSnapshot,
	archiveContent []byte,
	source string,
) error {
	organizationName, err := parseRequiredStringField(ctx.FormValue("organization_name"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	createdTenant, err := handler.tenant.CreateOrganization(
		ctx.Request().Context(),
		tenantapplication.CreateOrganizationCommand{
			Name:          organizationName,
			WorkspaceName: defaultImportedWorkspaceName(user),
		},
	)
	if err != nil {
		return writeImportingError(err)
	}
	if _, err := handler.members.EnsureWorkspaceOwner(
		ctx.Request().Context(),
		membershipapplication.EnsureWorkspaceOwnerCommand{
			WorkspaceID: int64(createdTenant.WorkspaceID),
			UserID:      user.ID,
		},
	); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	job, err := handler.importing.StartWorkspaceImport(
		ctx.Request().Context(),
		int64(createdTenant.WorkspaceID),
		user.ID,
		source,
		archiveContent,
	)
	if err != nil {
		return writeImportingError(err)
	}
	if job.Status == importingapplication.ImportStatusCompleted {
		if err := handler.homes.Save(
			ctx.Request().Context(),
			user.ID,
			int64(createdTenant.OrganizationID),
			int64(createdTenant.WorkspaceID),
		); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
		}
	}
	return ctx.JSON(http.StatusAccepted, importJobBodyWithOrganization(job, int(createdTenant.OrganizationID)))
}

func (handler *Handler) createTimeEntriesImportJob(
	ctx echo.Context,
	userID int64,
	csvContent []byte,
	source string,
) error {
	workspaceID, err := parseInt64Field(ctx.FormValue("workspace_id"))
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	job, err := handler.importing.StartWorkspaceTimeEntriesImport(
		ctx.Request().Context(),
		workspaceID,
		userID,
		source,
		csvContent,
	)
	if err != nil {
		return writeImportingError(err)
	}
	return ctx.JSON(http.StatusAccepted, importJobBody(job))
}

func writeImportingError(err error) error {
	switch {
	case errors.Is(err, importingapplication.ErrObjectsRequired),
		errors.Is(err, importingapplication.ErrInvalidScopeID),
		errors.Is(err, importingapplication.ErrImportArchiveRequired),
		errors.Is(err, importingapplication.ErrImportArchiveInvalid),
		errors.Is(err, importingapplication.ErrImportSourceInvalid):
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	case errors.Is(err, importingapplication.ErrExportNotFound):
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	case errors.Is(err, importingapplication.ErrImportJobNotFound):
		return echo.NewHTTPError(http.StatusNotFound, "Not Found").SetInternal(err)
	default:
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error()).SetInternal(err)
	}
}
