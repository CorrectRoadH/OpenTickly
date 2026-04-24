package bootstrap

import (
	"net/http"

	. "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

type publicTrackUnimplementedServer struct{}

var _ publictrackapi.ServerInterface = (*publicTrackUnimplementedServer)(nil)

func (server *publicTrackUnimplementedServer) GetAuditLogs(ctx echo.Context, organizationId int, from string, to string, params GetAuditLogsParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetSaml2LoginUrl(ctx echo.Context, params GetSaml2LoginUrlParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostSaml2Callback(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteAvatars(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostAvatars(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostUseGravatar(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetCountries(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetCountriesCountryIdSubdivisions(ctx echo.Context, countryId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetCurrencies(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetDesktopLogin(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostDesktopLoginTokens(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostUnifiedFeedback(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetIcal(ctx echo.Context, token string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

// Calendar integration endpoints are intentionally unimplemented.
// These require third-party OAuth connections (Google Calendar, Outlook)
// which are not supported in self-hosted OpenTickly deployments.
// Upstream Toggl Track provides these as a SaaS-only feature.

func (server *publicTrackUnimplementedServer) GetIntegrationsCalendar(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetIntegrationsCalendarCalendars(ctx echo.Context, params GetIntegrationsCalendarCalendarsParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetIntegrationsCalendarCalendarsSelected(ctx echo.Context, params GetIntegrationsCalendarCalendarsSelectedParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetIntegrationsCalendarEvents(ctx echo.Context, params GetIntegrationsCalendarEventsParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostIntegrationsCalendarEventsDetailsSuggestion(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostIntegrationsCalendarEventsUpdate(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetIntegrationsCalendarEventsEventIdDetailsSuggestion(ctx echo.Context, eventId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetIntegrationsCalendarSetup(ctx echo.Context, params GetIntegrationsCalendarSetupParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteIntegrationsCalendarIntegrationId(ctx echo.Context, integrationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutIntegrationsCalendarIntegrationId(ctx echo.Context, integrationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetIntegrationsCalendarIntegrationIdCalendars(ctx echo.Context, integrationId int, params GetIntegrationsCalendarIntegrationIdCalendarsParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostIntegrationsCalendarIntegrationIdCalendarsUpdate(ctx echo.Context, integrationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PatchIntegrationsCalendarIntegrationIdCalendarsCalendarId(ctx echo.Context, integrationId int, calendarId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetIntegrationsCalendarIntegrationIdCalendarsCalendarIdEventsEventIdAttendees(ctx echo.Context, integrationId int, calendarId int, eventId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetIntegrationsCalendarIntegrationIdCalendarsIdCalendarEvents(ctx echo.Context, integrationId int, idCalendar string, params GetIntegrationsCalendarIntegrationIdCalendarsIdCalendarEventsParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetInvitations(ctx echo.Context, invitationCode string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetKeys(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetMe(ctx echo.Context, params GetMeParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutMe(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostMeAcceptTos(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetClients(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostCloseAccount(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostMeDisableProductEmails(ctx echo.Context, disableCode string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostMeDisableWeeklyReport(ctx echo.Context, weeklyReportCode string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostEnableSso(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetMeExport(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostMeExport(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetMeExportDataUuidZip(ctx echo.Context, uuid string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetFavorites(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) CreateFavorite(ctx echo.Context, params CreateFavoriteParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) UpdateFavorite(ctx echo.Context, params UpdateFavoriteParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostFavoritesSuggestions(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteFavorite(ctx echo.Context, favoriteId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetMeFeatures(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetMeFlags(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostMeFlags(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetMeId(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetMeLocation(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetMeLogged(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetOrganizations(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetPreferences(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostPreferences(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetPreferencesClient(ctx echo.Context, client GetPreferencesClientParamsClient) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostPreferencesClient(ctx echo.Context, client PostPreferencesClientParamsClient) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetMeProjects(ctx echo.Context, params GetMeProjectsParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetMeProjectsPaginated(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeletePushServices(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetPushServices(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostPushServices(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetQuota(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostResetToken(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetTags(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetTasks(ctx echo.Context, params GetTasksParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetTimeEntries(ctx echo.Context, params GetTimeEntriesParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetTimeEntriesChecklist(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetCurrentTimeEntry(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetTimeEntryById(ctx echo.Context, timeEntryId int, params GetTimeEntryByIdParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostMeTimeEntriesSharedWith(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetMeTimesheets(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetMeTrackReminders(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWebTimer(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaces(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostOrganization(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostOrganizationAcceptInvitation(ctx echo.Context, invitationCode string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostRejectInvitation(ctx echo.Context, invitationCode string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetOrganization(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutOrganization(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetOrganizationGroups(ctx echo.Context, organizationId int, params GetOrganizationGroupsParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostOrganizationGroup(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteOrganizationGroup(ctx echo.Context, organizationId int, groupId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PatchOrganizationGroup(ctx echo.Context, organizationId int, groupId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutOrganizationGroup(ctx echo.Context, organizationId int, groupId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostOrganizationSlackIntegrationRequest(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostOrganizationInvitation(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutInvitation(ctx echo.Context, organizationId int, invitationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetOrganizationInvoice(ctx echo.Context, organizationId int, invoiceUid string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetOrganizationOwner(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetOwnershipTransfers(ctx echo.Context, organizationId int, params GetOwnershipTransfersParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostOwnershipTransfer(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetOwnershipTransfer(ctx echo.Context, organizationId int, transferId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostOwnershipTransferActions(ctx echo.Context, organizationId int, transferId int, action PostOwnershipTransferActionsParamsAction) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetOrganizationsPaymentsRecords(ctx echo.Context, organizationId int, params GetOrganizationsPaymentsRecordsParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetOrganizationsPlans(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetOrganizationsPlan(ctx echo.Context, organizationId int, planId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetOrganizationRoles(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetOrganizationSegmentation(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutOrganizationSegmentation(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteOrganizationSubscription(ctx echo.Context, organizationId int, params DeleteOrganizationSubscriptionParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetOrganizationSubscription(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostOrganizationSubscription(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutOrganizationSubscription(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostOrganizationSubscriptionCancellationFeedback(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetUnifiedCustomer(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostUnifiedCustomer(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutUnifiedCustomer(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostOrganizationSubscriptionDiscountRequest(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetFeatureUpsellMulti(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetOrganizationInvoiceSummary(ctx echo.Context, organizationId int, params GetOrganizationInvoiceSummaryParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetOrganizationSubscriptionPaymentFailed(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeletePromotionCode(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostPromotionCode(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetOrganizationPurchaseOrderPdf(ctx echo.Context, organizationId int, purchaseOrderUid string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) CreateSetupIntent(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteOrganizationTrial(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostOrganizationSubscriptionCreateTrial(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostOrganizationSubscriptionUpgradeRequest(ctx echo.Context, organizationId int, featureId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteOrganizationSubscriptionUsageBasedDiscount(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostOrganizationSubscriptionUsageBasedDiscount(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetOrganizationUsage(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetOrganizationUsers(ctx echo.Context, organizationId int, params GetOrganizationUsersParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PatchOrganizationUsers(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetOrganizationUsersDetailed(ctx echo.Context, organizationId int, params GetOrganizationUsersDetailedParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteOrganizationUsersLeave(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutOrganizationUsers(ctx echo.Context, organizationId int, organizationUserId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostOrganizationWorkspaces(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetOrganizationWorkspacesStatistics(ctx echo.Context, organizationId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetOrganizationWorkspacesGroups(ctx echo.Context, organizationId int, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetOrganizationWorkspacesWorkspaceusers(ctx echo.Context, organizationId int, workspaceId int, params GetOrganizationWorkspacesWorkspaceusersParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PatchOrganizationWorkspaceUsers(ctx echo.Context, organizationId int, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostSmailContact(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostSmailDemo(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostSmailMeet(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetStatus(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetAllPlans(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetSyncServerMeGoals(ctx echo.Context, params GetSyncServerMeGoalsParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteTimeline(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetTimeline(ctx echo.Context, params GetTimelineParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostTimeline(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetTimezones(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetOffsets(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetPublicSubscriptionPlans(ctx echo.Context) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspace(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutWorkspaces(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetAlerts(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostAlerts(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteAlerts(ctx echo.Context, workspaceId int, alertId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutAlerts(ctx echo.Context, workspaceId int, alertId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceClients(ctx echo.Context, workspaceId int, params GetWorkspaceClientsParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceClients(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) ArchiveClients(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceClientsData(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceClients(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceClient(ctx echo.Context, workspaceId int, clientId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceClient(ctx echo.Context, workspaceId int, clientId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceClients(ctx echo.Context, workspaceId int, clientId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) ArchiveClient(ctx echo.Context, workspaceId int, clientId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) RestoreClient(ctx echo.Context, workspaceId int, clientId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceCurrencies(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceAllActivities(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceMostActive(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceTopActivity(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetExpense(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostExpense(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceExports(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceExports(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceExportsDataUuidZip(ctx echo.Context, workspaceId int, uuid string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceFavorites(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) CreateWorkspaceFavorite(ctx echo.Context, workspaceId int, params CreateWorkspaceFavoriteParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) UpdateWorkspaceFavorite(ctx echo.Context, workspaceId int, params UpdateWorkspaceFavoriteParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceFavoritesSuggestions(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) WorkspaceDeleteFavorite(ctx echo.Context, workspaceId int, favoriteId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspacesWorkspaceIdGoals(ctx echo.Context, workspaceId int, params GetWorkspacesWorkspaceIdGoalsParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostWorkspacesWorkspaceIdGoals(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspacesWorkspaceIdGoalsGoalId(ctx echo.Context, workspaceId int, goalId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspacesWorkspaceIdGoalsGoalId(ctx echo.Context, workspaceId int, goalId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutWorkspacesWorkspaceIdGoalsGoalId(ctx echo.Context, workspaceId int, goalId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceGroups(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceGroup(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceGroup(ctx echo.Context, workspaceId int, groupId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceGroup(ctx echo.Context, workspaceId int, groupId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceIcalReset(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceIcalToggle(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceInvoices(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceUserInvoice(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceInvoice(ctx echo.Context, workspaceId int, invoiceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceInvoice(ctx echo.Context, workspaceId int, userInvoiceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceSso(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceLinkedSsoProfiles(ctx echo.Context, workspaceId int, ssoProfileId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceSso(ctx echo.Context, workspaceId int, ssoProfileId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceLogo(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceLogo(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceLogo(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspacePaymentReceipts(ctx echo.Context, workspaceId int, paymentId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspacePreferences(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostWorkspacePreferences(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetProjectGroups(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostProjectGroup(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteProjectGroup(ctx echo.Context, workspaceId int, projectGroupId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceProjectUsers(ctx echo.Context, workspaceId int, params GetWorkspaceProjectUsersParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceProjectUsers(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceProjectUsersPaginated(ctx echo.Context, workspaceId int, params PostWorkspaceProjectUsersPaginatedParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PatchWorkspaceProjectUsersIds(ctx echo.Context, workspaceId int, projectUserIds []int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceProjectUsers(ctx echo.Context, workspaceId int, projectUserId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceProjectUsers(ctx echo.Context, workspaceId int, projectUserId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetProjects(ctx echo.Context, workspaceId int, params GetProjectsParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceProjectCreate(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostWorkspacesWorkspaceIdProjectsBillableAmounts(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) ProjectTaskCount(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetProjectsTemplates(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) ProjectUserCount(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PatchWorkspaceProjects(ctx echo.Context, workspaceId int, projectIds string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceProject(ctx echo.Context, workspaceId int, projectId int, params DeleteWorkspaceProjectParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspacesWorkspaceIdProjectsProjectId(ctx echo.Context, workspaceId int, projectId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceProject(ctx echo.Context, workspaceId int, projectId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceProjectPeriods(ctx echo.Context, workspaceId int, projectId int, params GetWorkspaceProjectPeriodsParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostPinnedProject(ctx echo.Context, workspaceId int, projectId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspacesWorkspaceIdProjectsProjectIdStatistics(ctx echo.Context, workspaceId int, projectId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceProjectTasks(ctx echo.Context, workspaceId int, projectId int, params GetWorkspaceProjectTasksParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceProjectTasks(ctx echo.Context, workspaceId int, projectId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PatchWorkspaceProjectTasks(ctx echo.Context, workspaceId int, projectId int, taskIds string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceProjectTask(ctx echo.Context, workspaceId int, projectId int, taskId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceProjectTask(ctx echo.Context, workspaceId int, projectId int, taskId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceProjectTask(ctx echo.Context, workspaceId int, projectId int, taskId string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) CreateRate(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetRatesByLevel(ctx echo.Context, workspaceId int, level string, levelId int, params GetRatesByLevelParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

// Saved/shared report endpoints — to be implemented with full persistence stack.
// See: saved_reports and scheduled_reports tables in schema.sql.

func (server *publicTrackUnimplementedServer) GetSharedReport(ctx echo.Context, workspaceId int, params GetSharedReportParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostSharedReport(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutSharedReport(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) BulkDeleteSavedReportResource(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteSavedReportResource(ctx echo.Context, workspaceId int, reportId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetSavedReportResource(ctx echo.Context, workspaceId int, reportId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutSavedReportResource(ctx echo.Context, workspaceId int, reportId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceScheduledReports(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceScheduledReports(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceScheduledReports(ctx echo.Context, workspaceId int, reportId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceStatistics(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceSubscription(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspacePurchaseOrderPdf(ctx echo.Context, workspaceId int, purchaseOrderId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceTag(ctx echo.Context, workspaceId int, params GetWorkspaceTagParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PatchWorkspaceTags(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceTag(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceTag(ctx echo.Context, workspaceId int, tagId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceTag(ctx echo.Context, workspaceId int, tagId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceTasks(ctx echo.Context, workspaceId int, params GetWorkspaceTasksParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceTasksBasic(ctx echo.Context, workspaceId int, params GetWorkspaceTasksBasicParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceTasksData(ctx echo.Context, workspaceId int, params GetWorkspaceTasksDataParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceTimeEntries(ctx echo.Context, workspaceId int, params PostWorkspaceTimeEntriesParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PatchTimeEntries(ctx echo.Context, workspaceId int, timeEntryIds []int, params PatchTimeEntriesParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceTimeEntries(ctx echo.Context, workspaceId int, timeEntryId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceTimeEntryHandler(ctx echo.Context, workspaceId int, timeEntryId int, params PutWorkspaceTimeEntryHandlerParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PatchWorkspaceStopTimeEntryHandler(ctx echo.Context, workspaceId int, timeEntryId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceTimeEntryConstraints(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceTimeEntryConstraints(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceTimeEntryInvitations(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceTimeEntryInvitationAction(ctx echo.Context, workspaceId int, timeEntryInvitationId int, action string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetTimesheetSetups(ctx echo.Context, workspaceId int, params GetTimesheetSetupsParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostTimesheetSetups(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteTimesheetSetups(ctx echo.Context, workspaceId int, setupId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutTimesheetSetups(ctx echo.Context, workspaceId int, setupId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceTimesheetsHandler(ctx echo.Context, workspaceId int, params GetWorkspaceTimesheetsHandlerParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceTimesheetsBatchHandler(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceTimesheetHoursHandler(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceTimesheetsHandler(ctx echo.Context, workspaceId int, setupId int, startDate string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceTimesheetHistoryHandler(ctx echo.Context, workspaceId int, setupId int, startDate string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceTimesheetTimeEntriesHandler(ctx echo.Context, workspaceId int, setupId int, startDate string) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceTrackReminders(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceTrackReminders(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceTrackReminder(ctx echo.Context, workspaceId int, reminderId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceTrackReminder(ctx echo.Context, workspaceId int, reminderId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceUsers(ctx echo.Context, workspaceId int, params GetWorkspaceUsersParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceUsersData(ctx echo.Context, workspaceId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceUsers(ctx echo.Context, workspaceId int, userId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceWorkspaceUsers(ctx echo.Context, workspaceId int, params GetWorkspaceWorkspaceUsersParams) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceUser(ctx echo.Context, workspaceId int, workspaceUserId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceWorkspaceUsers(ctx echo.Context, workspaceId int, workspaceUserId int) error {
	return echo.NewHTTPError(http.StatusNotImplemented, "Not Implemented")
}
