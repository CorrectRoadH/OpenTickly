package bootstrap

import (
	. "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

type publicTrackUnimplementedServer struct{}

var _ publictrackapi.ServerInterface = (*publicTrackUnimplementedServer)(nil)

func (server *publicTrackUnimplementedServer) GetAuditLogs(ctx echo.Context, organizationId int, from string, to string, params GetAuditLogsParams) error {
	panic("TODO: implement public-track GetAuditLogs")
}

func (server *publicTrackUnimplementedServer) GetSaml2LoginUrl(ctx echo.Context, params GetSaml2LoginUrlParams) error {
	panic("TODO: implement public-track GetSaml2LoginUrl")
}

func (server *publicTrackUnimplementedServer) PostSaml2Callback(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PostSaml2Callback")
}

func (server *publicTrackUnimplementedServer) DeleteAvatars(ctx echo.Context) error {
	panic("TODO: implement public-track DeleteAvatars")
}

func (server *publicTrackUnimplementedServer) PostAvatars(ctx echo.Context) error {
	panic("TODO: implement public-track PostAvatars")
}

func (server *publicTrackUnimplementedServer) PostUseGravatar(ctx echo.Context) error {
	panic("TODO: implement public-track PostUseGravatar")
}

func (server *publicTrackUnimplementedServer) GetCountries(ctx echo.Context) error {
	panic("TODO: implement public-track GetCountries")
}

func (server *publicTrackUnimplementedServer) GetCountriesCountryIdSubdivisions(ctx echo.Context, countryId int) error {
	panic("TODO: implement public-track GetCountriesCountryIdSubdivisions")
}

func (server *publicTrackUnimplementedServer) GetCurrencies(ctx echo.Context) error {
	panic("TODO: implement public-track GetCurrencies")
}

func (server *publicTrackUnimplementedServer) GetDesktopLogin(ctx echo.Context) error {
	panic("TODO: implement public-track GetDesktopLogin")
}

func (server *publicTrackUnimplementedServer) PostDesktopLoginTokens(ctx echo.Context) error {
	panic("TODO: implement public-track PostDesktopLoginTokens")
}

func (server *publicTrackUnimplementedServer) PostUnifiedFeedback(ctx echo.Context) error {
	panic("TODO: implement public-track PostUnifiedFeedback")
}

func (server *publicTrackUnimplementedServer) GetIcal(ctx echo.Context, token string) error {
	panic("TODO: implement public-track GetIcal")
}

func (server *publicTrackUnimplementedServer) GetIntegrationsCalendar(ctx echo.Context) error {
	panic("TODO: implement public-track GetIntegrationsCalendar")
}

func (server *publicTrackUnimplementedServer) GetIntegrationsCalendarCalendars(ctx echo.Context, params GetIntegrationsCalendarCalendarsParams) error {
	panic("TODO: implement public-track GetIntegrationsCalendarCalendars")
}

func (server *publicTrackUnimplementedServer) GetIntegrationsCalendarCalendarsSelected(ctx echo.Context, params GetIntegrationsCalendarCalendarsSelectedParams) error {
	panic("TODO: implement public-track GetIntegrationsCalendarCalendarsSelected")
}

func (server *publicTrackUnimplementedServer) GetIntegrationsCalendarEvents(ctx echo.Context, params GetIntegrationsCalendarEventsParams) error {
	panic("TODO: implement public-track GetIntegrationsCalendarEvents")
}

func (server *publicTrackUnimplementedServer) PostIntegrationsCalendarEventsDetailsSuggestion(ctx echo.Context) error {
	panic("TODO: implement public-track PostIntegrationsCalendarEventsDetailsSuggestion")
}

func (server *publicTrackUnimplementedServer) PostIntegrationsCalendarEventsUpdate(ctx echo.Context) error {
	panic("TODO: implement public-track PostIntegrationsCalendarEventsUpdate")
}

func (server *publicTrackUnimplementedServer) GetIntegrationsCalendarEventsEventIdDetailsSuggestion(ctx echo.Context, eventId int) error {
	panic("TODO: implement public-track GetIntegrationsCalendarEventsEventIdDetailsSuggestion")
}

func (server *publicTrackUnimplementedServer) GetIntegrationsCalendarSetup(ctx echo.Context, params GetIntegrationsCalendarSetupParams) error {
	panic("TODO: implement public-track GetIntegrationsCalendarSetup")
}

func (server *publicTrackUnimplementedServer) DeleteIntegrationsCalendarIntegrationId(ctx echo.Context, integrationId int) error {
	panic("TODO: implement public-track DeleteIntegrationsCalendarIntegrationId")
}

func (server *publicTrackUnimplementedServer) PutIntegrationsCalendarIntegrationId(ctx echo.Context, integrationId int) error {
	panic("TODO: implement public-track PutIntegrationsCalendarIntegrationId")
}

func (server *publicTrackUnimplementedServer) GetIntegrationsCalendarIntegrationIdCalendars(ctx echo.Context, integrationId int, params GetIntegrationsCalendarIntegrationIdCalendarsParams) error {
	panic("TODO: implement public-track GetIntegrationsCalendarIntegrationIdCalendars")
}

func (server *publicTrackUnimplementedServer) PostIntegrationsCalendarIntegrationIdCalendarsUpdate(ctx echo.Context, integrationId int) error {
	panic("TODO: implement public-track PostIntegrationsCalendarIntegrationIdCalendarsUpdate")
}

func (server *publicTrackUnimplementedServer) PatchIntegrationsCalendarIntegrationIdCalendarsCalendarId(ctx echo.Context, integrationId int, calendarId int) error {
	panic("TODO: implement public-track PatchIntegrationsCalendarIntegrationIdCalendarsCalendarId")
}

func (server *publicTrackUnimplementedServer) GetIntegrationsCalendarIntegrationIdCalendarsCalendarIdEventsEventIdAttendees(ctx echo.Context, integrationId int, calendarId int, eventId int) error {
	panic("TODO: implement public-track GetIntegrationsCalendarIntegrationIdCalendarsCalendarIdEventsEventIdAttendees")
}

func (server *publicTrackUnimplementedServer) GetIntegrationsCalendarIntegrationIdCalendarsIdCalendarEvents(ctx echo.Context, integrationId int, idCalendar string, params GetIntegrationsCalendarIntegrationIdCalendarsIdCalendarEventsParams) error {
	panic("TODO: implement public-track GetIntegrationsCalendarIntegrationIdCalendarsIdCalendarEvents")
}

func (server *publicTrackUnimplementedServer) GetInvitations(ctx echo.Context, invitationCode string) error {
	panic("TODO: implement public-track GetInvitations")
}

func (server *publicTrackUnimplementedServer) GetKeys(ctx echo.Context) error {
	panic("TODO: implement public-track GetKeys")
}

func (server *publicTrackUnimplementedServer) GetMe(ctx echo.Context, params GetMeParams) error {
	panic("TODO: implement public-track GetMe")
}

func (server *publicTrackUnimplementedServer) PutMe(ctx echo.Context) error {
	panic("TODO: implement public-track PutMe")
}

func (server *publicTrackUnimplementedServer) PostMeAcceptTos(ctx echo.Context) error {
	panic("TODO: implement public-track PostMeAcceptTos")
}

func (server *publicTrackUnimplementedServer) GetClients(ctx echo.Context) error {
	panic("TODO: implement public-track GetClients")
}

func (server *publicTrackUnimplementedServer) PostCloseAccount(ctx echo.Context) error {
	panic("TODO: implement public-track PostCloseAccount")
}

func (server *publicTrackUnimplementedServer) PostMeDisableProductEmails(ctx echo.Context, disableCode string) error {
	panic("TODO: implement public-track PostMeDisableProductEmails")
}

func (server *publicTrackUnimplementedServer) PostMeDisableWeeklyReport(ctx echo.Context, weeklyReportCode string) error {
	panic("TODO: implement public-track PostMeDisableWeeklyReport")
}

func (server *publicTrackUnimplementedServer) PostEnableSso(ctx echo.Context) error {
	panic("TODO: implement public-track PostEnableSso")
}

func (server *publicTrackUnimplementedServer) GetMeExport(ctx echo.Context) error {
	panic("TODO: implement public-track GetMeExport")
}

func (server *publicTrackUnimplementedServer) PostMeExport(ctx echo.Context) error {
	panic("TODO: implement public-track PostMeExport")
}

func (server *publicTrackUnimplementedServer) GetMeExportDataUuidZip(ctx echo.Context, uuid string) error {
	panic("TODO: implement public-track GetMeExportDataUuidZip")
}

func (server *publicTrackUnimplementedServer) GetFavorites(ctx echo.Context) error {
	panic("TODO: implement public-track GetFavorites")
}

func (server *publicTrackUnimplementedServer) CreateFavorite(ctx echo.Context, params CreateFavoriteParams) error {
	panic("TODO: implement public-track CreateFavorite")
}

func (server *publicTrackUnimplementedServer) UpdateFavorite(ctx echo.Context, params UpdateFavoriteParams) error {
	panic("TODO: implement public-track UpdateFavorite")
}

func (server *publicTrackUnimplementedServer) PostFavoritesSuggestions(ctx echo.Context) error {
	panic("TODO: implement public-track PostFavoritesSuggestions")
}

func (server *publicTrackUnimplementedServer) DeleteFavorite(ctx echo.Context, favoriteId int) error {
	panic("TODO: implement public-track DeleteFavorite")
}

func (server *publicTrackUnimplementedServer) GetMeFeatures(ctx echo.Context) error {
	panic("TODO: implement public-track GetMeFeatures")
}

func (server *publicTrackUnimplementedServer) GetMeFlags(ctx echo.Context) error {
	panic("TODO: implement public-track GetMeFlags")
}

func (server *publicTrackUnimplementedServer) PostMeFlags(ctx echo.Context) error {
	panic("TODO: implement public-track PostMeFlags")
}

func (server *publicTrackUnimplementedServer) GetMeId(ctx echo.Context) error {
	panic("TODO: implement public-track GetMeId")
}

func (server *publicTrackUnimplementedServer) GetMeLocation(ctx echo.Context) error {
	panic("TODO: implement public-track GetMeLocation")
}

func (server *publicTrackUnimplementedServer) GetMeLogged(ctx echo.Context) error {
	panic("TODO: implement public-track GetMeLogged")
}

func (server *publicTrackUnimplementedServer) GetOrganizations(ctx echo.Context) error {
	panic("TODO: implement public-track GetOrganizations")
}

func (server *publicTrackUnimplementedServer) GetPreferences(ctx echo.Context) error {
	panic("TODO: implement public-track GetPreferences")
}

func (server *publicTrackUnimplementedServer) PostPreferences(ctx echo.Context) error {
	panic("TODO: implement public-track PostPreferences")
}

func (server *publicTrackUnimplementedServer) GetPreferencesClient(ctx echo.Context, client GetPreferencesClientParamsClient) error {
	panic("TODO: implement public-track GetPreferencesClient")
}

func (server *publicTrackUnimplementedServer) PostPreferencesClient(ctx echo.Context, client PostPreferencesClientParamsClient) error {
	panic("TODO: implement public-track PostPreferencesClient")
}

func (server *publicTrackUnimplementedServer) GetMeProjects(ctx echo.Context, params GetMeProjectsParams) error {
	panic("TODO: implement public-track GetMeProjects")
}

func (server *publicTrackUnimplementedServer) GetMeProjectsPaginated(ctx echo.Context) error {
	panic("TODO: implement public-track GetMeProjectsPaginated")
}

func (server *publicTrackUnimplementedServer) DeletePushServices(ctx echo.Context) error {
	panic("TODO: implement public-track DeletePushServices")
}

func (server *publicTrackUnimplementedServer) GetPushServices(ctx echo.Context) error {
	panic("TODO: implement public-track GetPushServices")
}

func (server *publicTrackUnimplementedServer) PostPushServices(ctx echo.Context) error {
	panic("TODO: implement public-track PostPushServices")
}

func (server *publicTrackUnimplementedServer) GetQuota(ctx echo.Context) error {
	panic("TODO: implement public-track GetQuota")
}

func (server *publicTrackUnimplementedServer) PostResetToken(ctx echo.Context) error {
	panic("TODO: implement public-track PostResetToken")
}

func (server *publicTrackUnimplementedServer) GetTags(ctx echo.Context) error {
	panic("TODO: implement public-track GetTags")
}

func (server *publicTrackUnimplementedServer) GetTasks(ctx echo.Context, params GetTasksParams) error {
	panic("TODO: implement public-track GetTasks")
}

func (server *publicTrackUnimplementedServer) GetTimeEntries(ctx echo.Context, params GetTimeEntriesParams) error {
	panic("TODO: implement public-track GetTimeEntries")
}

func (server *publicTrackUnimplementedServer) GetTimeEntriesChecklist(ctx echo.Context) error {
	panic("TODO: implement public-track GetTimeEntriesChecklist")
}

func (server *publicTrackUnimplementedServer) GetCurrentTimeEntry(ctx echo.Context) error {
	panic("TODO: implement public-track GetCurrentTimeEntry")
}

func (server *publicTrackUnimplementedServer) GetTimeEntryById(ctx echo.Context, timeEntryId int, params GetTimeEntryByIdParams) error {
	panic("TODO: implement public-track GetTimeEntryById")
}

func (server *publicTrackUnimplementedServer) PostMeTimeEntriesSharedWith(ctx echo.Context) error {
	panic("TODO: implement public-track PostMeTimeEntriesSharedWith")
}

func (server *publicTrackUnimplementedServer) GetMeTimesheets(ctx echo.Context) error {
	panic("TODO: implement public-track GetMeTimesheets")
}

func (server *publicTrackUnimplementedServer) GetMeTrackReminders(ctx echo.Context) error {
	panic("TODO: implement public-track GetMeTrackReminders")
}

func (server *publicTrackUnimplementedServer) GetWebTimer(ctx echo.Context) error {
	panic("TODO: implement public-track GetWebTimer")
}

func (server *publicTrackUnimplementedServer) GetWorkspaces(ctx echo.Context) error {
	panic("TODO: implement public-track GetWorkspaces")
}

func (server *publicTrackUnimplementedServer) PostOrganization(ctx echo.Context) error {
	panic("TODO: implement public-track PostOrganization")
}

func (server *publicTrackUnimplementedServer) PostOrganizationAcceptInvitation(ctx echo.Context, invitationCode string) error {
	panic("TODO: implement public-track PostOrganizationAcceptInvitation")
}

func (server *publicTrackUnimplementedServer) PostRejectInvitation(ctx echo.Context, invitationCode string) error {
	panic("TODO: implement public-track PostRejectInvitation")
}

func (server *publicTrackUnimplementedServer) GetOrganization(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track GetOrganization")
}

func (server *publicTrackUnimplementedServer) PutOrganization(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track PutOrganization")
}

func (server *publicTrackUnimplementedServer) GetOrganizationGroups(ctx echo.Context, organizationId int, params GetOrganizationGroupsParams) error {
	panic("TODO: implement public-track GetOrganizationGroups")
}

func (server *publicTrackUnimplementedServer) PostOrganizationGroup(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track PostOrganizationGroup")
}

func (server *publicTrackUnimplementedServer) DeleteOrganizationGroup(ctx echo.Context, organizationId int, groupId int) error {
	panic("TODO: implement public-track DeleteOrganizationGroup")
}

func (server *publicTrackUnimplementedServer) PatchOrganizationGroup(ctx echo.Context, organizationId int, groupId int) error {
	panic("TODO: implement public-track PatchOrganizationGroup")
}

func (server *publicTrackUnimplementedServer) PutOrganizationGroup(ctx echo.Context, organizationId int, groupId int) error {
	panic("TODO: implement public-track PutOrganizationGroup")
}

func (server *publicTrackUnimplementedServer) PostOrganizationSlackIntegrationRequest(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track PostOrganizationSlackIntegrationRequest")
}

func (server *publicTrackUnimplementedServer) PostOrganizationInvitation(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track PostOrganizationInvitation")
}

func (server *publicTrackUnimplementedServer) PutInvitation(ctx echo.Context, organizationId int, invitationId int) error {
	panic("TODO: implement public-track PutInvitation")
}

func (server *publicTrackUnimplementedServer) GetOrganizationInvoice(ctx echo.Context, organizationId int, invoiceUid string) error {
	panic("TODO: implement public-track GetOrganizationInvoice")
}

func (server *publicTrackUnimplementedServer) GetOrganizationOwner(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track GetOrganizationOwner")
}

func (server *publicTrackUnimplementedServer) GetOwnershipTransfers(ctx echo.Context, organizationId int, params GetOwnershipTransfersParams) error {
	panic("TODO: implement public-track GetOwnershipTransfers")
}

func (server *publicTrackUnimplementedServer) PostOwnershipTransfer(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track PostOwnershipTransfer")
}

func (server *publicTrackUnimplementedServer) GetOwnershipTransfer(ctx echo.Context, organizationId int, transferId int) error {
	panic("TODO: implement public-track GetOwnershipTransfer")
}

func (server *publicTrackUnimplementedServer) PostOwnershipTransferActions(ctx echo.Context, organizationId int, transferId int, action PostOwnershipTransferActionsParamsAction) error {
	panic("TODO: implement public-track PostOwnershipTransferActions")
}

func (server *publicTrackUnimplementedServer) GetOrganizationsPaymentsRecords(ctx echo.Context, organizationId int, params GetOrganizationsPaymentsRecordsParams) error {
	panic("TODO: implement public-track GetOrganizationsPaymentsRecords")
}

func (server *publicTrackUnimplementedServer) GetOrganizationsPlans(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track GetOrganizationsPlans")
}

func (server *publicTrackUnimplementedServer) GetOrganizationsPlan(ctx echo.Context, organizationId int, planId int) error {
	panic("TODO: implement public-track GetOrganizationsPlan")
}

func (server *publicTrackUnimplementedServer) GetOrganizationRoles(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track GetOrganizationRoles")
}

func (server *publicTrackUnimplementedServer) GetOrganizationSegmentation(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track GetOrganizationSegmentation")
}

func (server *publicTrackUnimplementedServer) PutOrganizationSegmentation(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track PutOrganizationSegmentation")
}

func (server *publicTrackUnimplementedServer) DeleteOrganizationSubscription(ctx echo.Context, organizationId int, params DeleteOrganizationSubscriptionParams) error {
	panic("TODO: implement public-track DeleteOrganizationSubscription")
}

func (server *publicTrackUnimplementedServer) GetOrganizationSubscription(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track GetOrganizationSubscription")
}

func (server *publicTrackUnimplementedServer) PostOrganizationSubscription(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track PostOrganizationSubscription")
}

func (server *publicTrackUnimplementedServer) PutOrganizationSubscription(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track PutOrganizationSubscription")
}

func (server *publicTrackUnimplementedServer) PostOrganizationSubscriptionCancellationFeedback(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track PostOrganizationSubscriptionCancellationFeedback")
}

func (server *publicTrackUnimplementedServer) GetUnifiedCustomer(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track GetUnifiedCustomer")
}

func (server *publicTrackUnimplementedServer) PostUnifiedCustomer(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track PostUnifiedCustomer")
}

func (server *publicTrackUnimplementedServer) PutUnifiedCustomer(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track PutUnifiedCustomer")
}

func (server *publicTrackUnimplementedServer) PostOrganizationSubscriptionDiscountRequest(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track PostOrganizationSubscriptionDiscountRequest")
}

func (server *publicTrackUnimplementedServer) GetFeatureUpsellMulti(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track GetFeatureUpsellMulti")
}

func (server *publicTrackUnimplementedServer) GetOrganizationInvoiceSummary(ctx echo.Context, organizationId int, params GetOrganizationInvoiceSummaryParams) error {
	panic("TODO: implement public-track GetOrganizationInvoiceSummary")
}

func (server *publicTrackUnimplementedServer) GetOrganizationSubscriptionPaymentFailed(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track GetOrganizationSubscriptionPaymentFailed")
}

func (server *publicTrackUnimplementedServer) DeletePromotionCode(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track DeletePromotionCode")
}

func (server *publicTrackUnimplementedServer) PostPromotionCode(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track PostPromotionCode")
}

func (server *publicTrackUnimplementedServer) GetOrganizationPurchaseOrderPdf(ctx echo.Context, organizationId int, purchaseOrderUid string) error {
	panic("TODO: implement public-track GetOrganizationPurchaseOrderPdf")
}

func (server *publicTrackUnimplementedServer) CreateSetupIntent(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track CreateSetupIntent")
}

func (server *publicTrackUnimplementedServer) DeleteOrganizationTrial(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track DeleteOrganizationTrial")
}

func (server *publicTrackUnimplementedServer) PostOrganizationSubscriptionCreateTrial(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track PostOrganizationSubscriptionCreateTrial")
}

func (server *publicTrackUnimplementedServer) PostOrganizationSubscriptionUpgradeRequest(ctx echo.Context, organizationId int, featureId int) error {
	panic("TODO: implement public-track PostOrganizationSubscriptionUpgradeRequest")
}

func (server *publicTrackUnimplementedServer) DeleteOrganizationSubscriptionUsageBasedDiscount(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track DeleteOrganizationSubscriptionUsageBasedDiscount")
}

func (server *publicTrackUnimplementedServer) PostOrganizationSubscriptionUsageBasedDiscount(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track PostOrganizationSubscriptionUsageBasedDiscount")
}

func (server *publicTrackUnimplementedServer) GetOrganizationUsage(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track GetOrganizationUsage")
}

func (server *publicTrackUnimplementedServer) GetOrganizationUsers(ctx echo.Context, organizationId int, params GetOrganizationUsersParams) error {
	panic("TODO: implement public-track GetOrganizationUsers")
}

func (server *publicTrackUnimplementedServer) PatchOrganizationUsers(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track PatchOrganizationUsers")
}

func (server *publicTrackUnimplementedServer) GetOrganizationUsersDetailed(ctx echo.Context, organizationId int, params GetOrganizationUsersDetailedParams) error {
	panic("TODO: implement public-track GetOrganizationUsersDetailed")
}

func (server *publicTrackUnimplementedServer) DeleteOrganizationUsersLeave(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track DeleteOrganizationUsersLeave")
}

func (server *publicTrackUnimplementedServer) PutOrganizationUsers(ctx echo.Context, organizationId int, organizationUserId int) error {
	panic("TODO: implement public-track PutOrganizationUsers")
}

func (server *publicTrackUnimplementedServer) PostOrganizationWorkspaces(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track PostOrganizationWorkspaces")
}

func (server *publicTrackUnimplementedServer) GetOrganizationWorkspacesStatistics(ctx echo.Context, organizationId int) error {
	panic("TODO: implement public-track GetOrganizationWorkspacesStatistics")
}

func (server *publicTrackUnimplementedServer) GetOrganizationWorkspacesGroups(ctx echo.Context, organizationId int, workspaceId int) error {
	panic("TODO: implement public-track GetOrganizationWorkspacesGroups")
}

func (server *publicTrackUnimplementedServer) GetOrganizationWorkspacesWorkspaceusers(ctx echo.Context, organizationId int, workspaceId int, params GetOrganizationWorkspacesWorkspaceusersParams) error {
	panic("TODO: implement public-track GetOrganizationWorkspacesWorkspaceusers")
}

func (server *publicTrackUnimplementedServer) PatchOrganizationWorkspaceUsers(ctx echo.Context, organizationId int, workspaceId int) error {
	panic("TODO: implement public-track PatchOrganizationWorkspaceUsers")
}

func (server *publicTrackUnimplementedServer) PostSmailContact(ctx echo.Context) error {
	panic("TODO: implement public-track PostSmailContact")
}

func (server *publicTrackUnimplementedServer) PostSmailDemo(ctx echo.Context) error {
	panic("TODO: implement public-track PostSmailDemo")
}

func (server *publicTrackUnimplementedServer) PostSmailMeet(ctx echo.Context) error {
	panic("TODO: implement public-track PostSmailMeet")
}

func (server *publicTrackUnimplementedServer) GetStatus(ctx echo.Context) error {
	panic("TODO: implement public-track GetStatus")
}

func (server *publicTrackUnimplementedServer) GetAllPlans(ctx echo.Context) error {
	panic("TODO: implement public-track GetAllPlans")
}

func (server *publicTrackUnimplementedServer) GetSyncServerMeGoals(ctx echo.Context, params GetSyncServerMeGoalsParams) error {
	panic("TODO: implement public-track GetSyncServerMeGoals")
}

func (server *publicTrackUnimplementedServer) DeleteTimeline(ctx echo.Context) error {
	panic("TODO: implement public-track DeleteTimeline")
}

func (server *publicTrackUnimplementedServer) GetTimeline(ctx echo.Context, params GetTimelineParams) error {
	panic("TODO: implement public-track GetTimeline")
}

func (server *publicTrackUnimplementedServer) PostTimeline(ctx echo.Context) error {
	panic("TODO: implement public-track PostTimeline")
}

func (server *publicTrackUnimplementedServer) GetTimezones(ctx echo.Context) error {
	panic("TODO: implement public-track GetTimezones")
}

func (server *publicTrackUnimplementedServer) GetOffsets(ctx echo.Context) error {
	panic("TODO: implement public-track GetOffsets")
}

func (server *publicTrackUnimplementedServer) GetPublicSubscriptionPlans(ctx echo.Context) error {
	panic("TODO: implement public-track GetPublicSubscriptionPlans")
}

func (server *publicTrackUnimplementedServer) GetWorkspace(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track GetWorkspace")
}

func (server *publicTrackUnimplementedServer) PutWorkspaces(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PutWorkspaces")
}

func (server *publicTrackUnimplementedServer) GetAlerts(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track GetAlerts")
}

func (server *publicTrackUnimplementedServer) PostAlerts(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PostAlerts")
}

func (server *publicTrackUnimplementedServer) DeleteAlerts(ctx echo.Context, workspaceId int, alertId int) error {
	panic("TODO: implement public-track DeleteAlerts")
}

func (server *publicTrackUnimplementedServer) PutAlerts(ctx echo.Context, workspaceId int, alertId int) error {
	panic("TODO: implement public-track PutAlerts")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceClients(ctx echo.Context, workspaceId int, params GetWorkspaceClientsParams) error {
	panic("TODO: implement public-track GetWorkspaceClients")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceClients(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PostWorkspaceClients")
}

func (server *publicTrackUnimplementedServer) ArchiveClients(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track ArchiveClients")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceClientsData(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track GetWorkspaceClientsData")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceClients(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track DeleteWorkspaceClients")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceClient(ctx echo.Context, workspaceId int, clientId int) error {
	panic("TODO: implement public-track DeleteWorkspaceClient")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceClient(ctx echo.Context, workspaceId int, clientId int) error {
	panic("TODO: implement public-track GetWorkspaceClient")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceClients(ctx echo.Context, workspaceId int, clientId int) error {
	panic("TODO: implement public-track PutWorkspaceClients")
}

func (server *publicTrackUnimplementedServer) ArchiveClient(ctx echo.Context, workspaceId int, clientId int) error {
	panic("TODO: implement public-track ArchiveClient")
}

func (server *publicTrackUnimplementedServer) RestoreClient(ctx echo.Context, workspaceId int, clientId int) error {
	panic("TODO: implement public-track RestoreClient")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceCurrencies(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track GetWorkspaceCurrencies")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceAllActivities(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track GetWorkspaceAllActivities")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceMostActive(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track GetWorkspaceMostActive")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceTopActivity(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track GetWorkspaceTopActivity")
}

func (server *publicTrackUnimplementedServer) GetExpense(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track GetExpense")
}

func (server *publicTrackUnimplementedServer) PostExpense(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PostExpense")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceExports(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track GetWorkspaceExports")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceExports(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PostWorkspaceExports")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceExportsDataUuidZip(ctx echo.Context, workspaceId int, uuid string) error {
	panic("TODO: implement public-track GetWorkspaceExportsDataUuidZip")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceFavorites(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track GetWorkspaceFavorites")
}

func (server *publicTrackUnimplementedServer) CreateWorkspaceFavorite(ctx echo.Context, workspaceId int, params CreateWorkspaceFavoriteParams) error {
	panic("TODO: implement public-track CreateWorkspaceFavorite")
}

func (server *publicTrackUnimplementedServer) UpdateWorkspaceFavorite(ctx echo.Context, workspaceId int, params UpdateWorkspaceFavoriteParams) error {
	panic("TODO: implement public-track UpdateWorkspaceFavorite")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceFavoritesSuggestions(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PostWorkspaceFavoritesSuggestions")
}

func (server *publicTrackUnimplementedServer) WorkspaceDeleteFavorite(ctx echo.Context, workspaceId int, favoriteId int) error {
	panic("TODO: implement public-track WorkspaceDeleteFavorite")
}

func (server *publicTrackUnimplementedServer) GetWorkspacesWorkspaceIdGoals(ctx echo.Context, workspaceId int, params GetWorkspacesWorkspaceIdGoalsParams) error {
	panic("TODO: implement public-track GetWorkspacesWorkspaceIdGoals")
}

func (server *publicTrackUnimplementedServer) PostWorkspacesWorkspaceIdGoals(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PostWorkspacesWorkspaceIdGoals")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspacesWorkspaceIdGoalsGoalId(ctx echo.Context, workspaceId int, goalId int) error {
	panic("TODO: implement public-track DeleteWorkspacesWorkspaceIdGoalsGoalId")
}

func (server *publicTrackUnimplementedServer) GetWorkspacesWorkspaceIdGoalsGoalId(ctx echo.Context, workspaceId int, goalId int) error {
	panic("TODO: implement public-track GetWorkspacesWorkspaceIdGoalsGoalId")
}

func (server *publicTrackUnimplementedServer) PutWorkspacesWorkspaceIdGoalsGoalId(ctx echo.Context, workspaceId int, goalId int) error {
	panic("TODO: implement public-track PutWorkspacesWorkspaceIdGoalsGoalId")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceGroups(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track GetWorkspaceGroups")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceGroup(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PostWorkspaceGroup")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceGroup(ctx echo.Context, workspaceId int, groupId int) error {
	panic("TODO: implement public-track DeleteWorkspaceGroup")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceGroup(ctx echo.Context, workspaceId int, groupId int) error {
	panic("TODO: implement public-track PutWorkspaceGroup")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceIcalReset(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PostWorkspaceIcalReset")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceIcalToggle(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PostWorkspaceIcalToggle")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceInvoices(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track GetWorkspaceInvoices")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceUserInvoice(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PostWorkspaceUserInvoice")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceInvoice(ctx echo.Context, workspaceId int, invoiceId int) error {
	panic("TODO: implement public-track GetWorkspaceInvoice")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceInvoice(ctx echo.Context, workspaceId int, userInvoiceId int) error {
	panic("TODO: implement public-track DeleteWorkspaceInvoice")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceSso(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track GetWorkspaceSso")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceLinkedSsoProfiles(ctx echo.Context, workspaceId int, ssoProfileId int) error {
	panic("TODO: implement public-track DeleteWorkspaceLinkedSsoProfiles")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceSso(ctx echo.Context, workspaceId int, ssoProfileId int) error {
	panic("TODO: implement public-track PutWorkspaceSso")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceLogo(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track DeleteWorkspaceLogo")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceLogo(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track GetWorkspaceLogo")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceLogo(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PostWorkspaceLogo")
}

func (server *publicTrackUnimplementedServer) GetWorkspacePaymentReceipts(ctx echo.Context, workspaceId int, paymentId int) error {
	panic("TODO: implement public-track GetWorkspacePaymentReceipts")
}

func (server *publicTrackUnimplementedServer) GetWorkspacePreferences(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track GetWorkspacePreferences")
}

func (server *publicTrackUnimplementedServer) PostWorkspacePreferences(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PostWorkspacePreferences")
}

func (server *publicTrackUnimplementedServer) GetProjectGroups(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track GetProjectGroups")
}

func (server *publicTrackUnimplementedServer) PostProjectGroup(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PostProjectGroup")
}

func (server *publicTrackUnimplementedServer) DeleteProjectGroup(ctx echo.Context, workspaceId int, projectGroupId int) error {
	panic("TODO: implement public-track DeleteProjectGroup")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceProjectUsers(ctx echo.Context, workspaceId int, params GetWorkspaceProjectUsersParams) error {
	panic("TODO: implement public-track GetWorkspaceProjectUsers")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceProjectUsers(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PostWorkspaceProjectUsers")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceProjectUsersPaginated(ctx echo.Context, workspaceId int, params PostWorkspaceProjectUsersPaginatedParams) error {
	panic("TODO: implement public-track PostWorkspaceProjectUsersPaginated")
}

func (server *publicTrackUnimplementedServer) PatchWorkspaceProjectUsersIds(ctx echo.Context, workspaceId int, projectUserIds []int) error {
	panic("TODO: implement public-track PatchWorkspaceProjectUsersIds")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceProjectUsers(ctx echo.Context, workspaceId int, projectUserId int) error {
	panic("TODO: implement public-track DeleteWorkspaceProjectUsers")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceProjectUsers(ctx echo.Context, workspaceId int, projectUserId int) error {
	panic("TODO: implement public-track PutWorkspaceProjectUsers")
}

func (server *publicTrackUnimplementedServer) GetProjects(ctx echo.Context, workspaceId int, params GetProjectsParams) error {
	panic("TODO: implement public-track GetProjects")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceProjectCreate(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PostWorkspaceProjectCreate")
}

func (server *publicTrackUnimplementedServer) PostWorkspacesWorkspaceIdProjectsBillableAmounts(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PostWorkspacesWorkspaceIdProjectsBillableAmounts")
}

func (server *publicTrackUnimplementedServer) ProjectTaskCount(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track ProjectTaskCount")
}

func (server *publicTrackUnimplementedServer) GetProjectsTemplates(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track GetProjectsTemplates")
}

func (server *publicTrackUnimplementedServer) ProjectUserCount(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track ProjectUserCount")
}

func (server *publicTrackUnimplementedServer) PatchWorkspaceProjects(ctx echo.Context, workspaceId int, projectIds string) error {
	panic("TODO: implement public-track PatchWorkspaceProjects")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceProject(ctx echo.Context, workspaceId int, projectId int, params DeleteWorkspaceProjectParams) error {
	panic("TODO: implement public-track DeleteWorkspaceProject")
}

func (server *publicTrackUnimplementedServer) GetWorkspacesWorkspaceIdProjectsProjectId(ctx echo.Context, workspaceId int, projectId int) error {
	panic("TODO: implement public-track GetWorkspacesWorkspaceIdProjectsProjectId")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceProject(ctx echo.Context, workspaceId int, projectId int) error {
	panic("TODO: implement public-track PutWorkspaceProject")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceProjectPeriods(ctx echo.Context, workspaceId int, projectId int, params GetWorkspaceProjectPeriodsParams) error {
	panic("TODO: implement public-track GetWorkspaceProjectPeriods")
}

func (server *publicTrackUnimplementedServer) PostPinnedProject(ctx echo.Context, workspaceId int, projectId int) error {
	panic("TODO: implement public-track PostPinnedProject")
}

func (server *publicTrackUnimplementedServer) GetWorkspacesWorkspaceIdProjectsProjectIdStatistics(ctx echo.Context, workspaceId int, projectId int) error {
	panic("TODO: implement public-track GetWorkspacesWorkspaceIdProjectsProjectIdStatistics")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceProjectTasks(ctx echo.Context, workspaceId int, projectId int, params GetWorkspaceProjectTasksParams) error {
	panic("TODO: implement public-track GetWorkspaceProjectTasks")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceProjectTasks(ctx echo.Context, workspaceId int, projectId int) error {
	panic("TODO: implement public-track PostWorkspaceProjectTasks")
}

func (server *publicTrackUnimplementedServer) PatchWorkspaceProjectTasks(ctx echo.Context, workspaceId int, projectId int, taskIds string) error {
	panic("TODO: implement public-track PatchWorkspaceProjectTasks")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceProjectTask(ctx echo.Context, workspaceId int, projectId int, taskId int) error {
	panic("TODO: implement public-track DeleteWorkspaceProjectTask")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceProjectTask(ctx echo.Context, workspaceId int, projectId int, taskId int) error {
	panic("TODO: implement public-track GetWorkspaceProjectTask")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceProjectTask(ctx echo.Context, workspaceId int, projectId int, taskId string) error {
	panic("TODO: implement public-track PutWorkspaceProjectTask")
}

func (server *publicTrackUnimplementedServer) CreateRate(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track CreateRate")
}

func (server *publicTrackUnimplementedServer) GetRatesByLevel(ctx echo.Context, workspaceId int, level string, levelId int, params GetRatesByLevelParams) error {
	panic("TODO: implement public-track GetRatesByLevel")
}

func (server *publicTrackUnimplementedServer) GetSharedReport(ctx echo.Context, workspaceId int, params GetSharedReportParams) error {
	panic("TODO: implement public-track GetSharedReport")
}

func (server *publicTrackUnimplementedServer) PostSharedReport(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PostSharedReport")
}

func (server *publicTrackUnimplementedServer) PutSharedReport(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PutSharedReport")
}

func (server *publicTrackUnimplementedServer) BulkDeleteSavedReportResource(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track BulkDeleteSavedReportResource")
}

func (server *publicTrackUnimplementedServer) DeleteSavedReportResource(ctx echo.Context, workspaceId int, reportId int) error {
	panic("TODO: implement public-track DeleteSavedReportResource")
}

func (server *publicTrackUnimplementedServer) GetSavedReportResource(ctx echo.Context, workspaceId int, reportId int) error {
	panic("TODO: implement public-track GetSavedReportResource")
}

func (server *publicTrackUnimplementedServer) PutSavedReportResource(ctx echo.Context, workspaceId int, reportId int) error {
	panic("TODO: implement public-track PutSavedReportResource")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceScheduledReports(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track GetWorkspaceScheduledReports")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceScheduledReports(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PostWorkspaceScheduledReports")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceScheduledReports(ctx echo.Context, workspaceId int, reportId int) error {
	panic("TODO: implement public-track DeleteWorkspaceScheduledReports")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceStatistics(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track GetWorkspaceStatistics")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceSubscription(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track GetWorkspaceSubscription")
}

func (server *publicTrackUnimplementedServer) GetWorkspacePurchaseOrderPdf(ctx echo.Context, workspaceId int, purchaseOrderId int) error {
	panic("TODO: implement public-track GetWorkspacePurchaseOrderPdf")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceTag(ctx echo.Context, workspaceId int, params GetWorkspaceTagParams) error {
	panic("TODO: implement public-track GetWorkspaceTag")
}

func (server *publicTrackUnimplementedServer) PatchWorkspaceTags(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PatchWorkspaceTags")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceTag(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PostWorkspaceTag")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceTag(ctx echo.Context, workspaceId int, tagId int) error {
	panic("TODO: implement public-track DeleteWorkspaceTag")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceTag(ctx echo.Context, workspaceId int, tagId int) error {
	panic("TODO: implement public-track PutWorkspaceTag")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceTasks(ctx echo.Context, workspaceId int, params GetWorkspaceTasksParams) error {
	panic("TODO: implement public-track GetWorkspaceTasks")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceTasksBasic(ctx echo.Context, workspaceId int, params GetWorkspaceTasksBasicParams) error {
	panic("TODO: implement public-track GetWorkspaceTasksBasic")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceTasksData(ctx echo.Context, workspaceId int, params GetWorkspaceTasksDataParams) error {
	panic("TODO: implement public-track GetWorkspaceTasksData")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceTimeEntries(ctx echo.Context, workspaceId int, params PostWorkspaceTimeEntriesParams) error {
	panic("TODO: implement public-track PostWorkspaceTimeEntries")
}

func (server *publicTrackUnimplementedServer) PatchTimeEntries(ctx echo.Context, workspaceId int, timeEntryIds string, params PatchTimeEntriesParams) error {
	panic("TODO: implement public-track PatchTimeEntries")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceTimeEntries(ctx echo.Context, workspaceId int, timeEntryId int) error {
	panic("TODO: implement public-track DeleteWorkspaceTimeEntries")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceTimeEntryHandler(ctx echo.Context, workspaceId int, timeEntryId int, params PutWorkspaceTimeEntryHandlerParams) error {
	panic("TODO: implement public-track PutWorkspaceTimeEntryHandler")
}

func (server *publicTrackUnimplementedServer) PatchWorkspaceStopTimeEntryHandler(ctx echo.Context, workspaceId int, timeEntryId int) error {
	panic("TODO: implement public-track PatchWorkspaceStopTimeEntryHandler")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceTimeEntryConstraints(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track GetWorkspaceTimeEntryConstraints")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceTimeEntryConstraints(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PostWorkspaceTimeEntryConstraints")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceTimeEntryInvitations(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track GetWorkspaceTimeEntryInvitations")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceTimeEntryInvitationAction(ctx echo.Context, workspaceId int, timeEntryInvitationId int, action string) error {
	panic("TODO: implement public-track PostWorkspaceTimeEntryInvitationAction")
}

func (server *publicTrackUnimplementedServer) GetTimesheetSetups(ctx echo.Context, workspaceId int, params GetTimesheetSetupsParams) error {
	panic("TODO: implement public-track GetTimesheetSetups")
}

func (server *publicTrackUnimplementedServer) PostTimesheetSetups(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PostTimesheetSetups")
}

func (server *publicTrackUnimplementedServer) DeleteTimesheetSetups(ctx echo.Context, workspaceId int, setupId int) error {
	panic("TODO: implement public-track DeleteTimesheetSetups")
}

func (server *publicTrackUnimplementedServer) PutTimesheetSetups(ctx echo.Context, workspaceId int, setupId int) error {
	panic("TODO: implement public-track PutTimesheetSetups")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceTimesheetsHandler(ctx echo.Context, workspaceId int, params GetWorkspaceTimesheetsHandlerParams) error {
	panic("TODO: implement public-track GetWorkspaceTimesheetsHandler")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceTimesheetsBatchHandler(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PutWorkspaceTimesheetsBatchHandler")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceTimesheetHoursHandler(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track GetWorkspaceTimesheetHoursHandler")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceTimesheetsHandler(ctx echo.Context, workspaceId int, setupId int, startDate string) error {
	panic("TODO: implement public-track PutWorkspaceTimesheetsHandler")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceTimesheetHistoryHandler(ctx echo.Context, workspaceId int, setupId int, startDate string) error {
	panic("TODO: implement public-track GetWorkspaceTimesheetHistoryHandler")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceTimesheetTimeEntriesHandler(ctx echo.Context, workspaceId int, setupId int, startDate string) error {
	panic("TODO: implement public-track GetWorkspaceTimesheetTimeEntriesHandler")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceTrackReminders(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track GetWorkspaceTrackReminders")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceTrackReminders(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PostWorkspaceTrackReminders")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceTrackReminder(ctx echo.Context, workspaceId int, reminderId int) error {
	panic("TODO: implement public-track DeleteWorkspaceTrackReminder")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceTrackReminder(ctx echo.Context, workspaceId int, reminderId int) error {
	panic("TODO: implement public-track PutWorkspaceTrackReminder")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceUsers(ctx echo.Context, workspaceId int, params GetWorkspaceUsersParams) error {
	panic("TODO: implement public-track GetWorkspaceUsers")
}

func (server *publicTrackUnimplementedServer) PostWorkspaceUsersData(ctx echo.Context, workspaceId int) error {
	panic("TODO: implement public-track PostWorkspaceUsersData")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceUsers(ctx echo.Context, workspaceId int, userId int) error {
	panic("TODO: implement public-track PutWorkspaceUsers")
}

func (server *publicTrackUnimplementedServer) GetWorkspaceWorkspaceUsers(ctx echo.Context, workspaceId int, params GetWorkspaceWorkspaceUsersParams) error {
	panic("TODO: implement public-track GetWorkspaceWorkspaceUsers")
}

func (server *publicTrackUnimplementedServer) DeleteWorkspaceUser(ctx echo.Context, workspaceId int, workspaceUserId int) error {
	panic("TODO: implement public-track DeleteWorkspaceUser")
}

func (server *publicTrackUnimplementedServer) PutWorkspaceWorkspaceUsers(ctx echo.Context, workspaceId int, workspaceUserId int) error {
	panic("TODO: implement public-track PutWorkspaceWorkspaceUsers")
}
