package bootstrap

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	billingapplication "opentoggl/backend/apps/backend/internal/billing/application"
	billingdomain "opentoggl/backend/apps/backend/internal/billing/domain"
	billingpostgres "opentoggl/backend/apps/backend/internal/billing/infra/postgres"
	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	catalogpostgres "opentoggl/backend/apps/backend/internal/catalog/infra/postgres"
	governanceapplication "opentoggl/backend/apps/backend/internal/governance/application"
	governancepostgres "opentoggl/backend/apps/backend/internal/governance/infra/postgres"
	httpapp "opentoggl/backend/apps/backend/internal/http"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	identitydomain "opentoggl/backend/apps/backend/internal/identity/domain"
	identitypostgres "opentoggl/backend/apps/backend/internal/identity/infra/postgres"
	identitypublicapi "opentoggl/backend/apps/backend/internal/identity/transport/http/public-api"
	identityweb "opentoggl/backend/apps/backend/internal/identity/transport/http/web"
	importingapplication "opentoggl/backend/apps/backend/internal/importing/application"
	importingpostgres "opentoggl/backend/apps/backend/internal/importing/infra/postgres"
	"opentoggl/backend/apps/backend/internal/log"
	"opentoggl/backend/apps/backend/internal/platform"
	"opentoggl/backend/apps/backend/internal/platform/filestore"
	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"
	membershippostgres "opentoggl/backend/apps/backend/internal/membership/infra/postgres"
	platformapplication "opentoggl/backend/apps/backend/internal/platform/application"
	reportsapplication "opentoggl/backend/apps/backend/internal/reports/application"
	reportspostgres "opentoggl/backend/apps/backend/internal/reports/infra/postgres"
	tenantapplication "opentoggl/backend/apps/backend/internal/tenant/application"
	webhooksapplication "opentoggl/backend/apps/backend/internal/webhooks/application"
	webhookspostgres "opentoggl/backend/apps/backend/internal/webhooks/infra/postgres"
	tenantpostgres "opentoggl/backend/apps/backend/internal/tenant/infra/postgres"
	tenantweb "opentoggl/backend/apps/backend/internal/tenant/transport/http/web"
	telemetryapplication "opentoggl/backend/apps/backend/internal/telemetry/application"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"
	trackingpostgres "opentoggl/backend/apps/backend/internal/tracking/infra/postgres"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
)

const sessionCookieName = "opentoggl_session"
const currentSessionHomeContextKey = "current_session_home"

func newWebRoutes(handlers *routeHandlers) (httpapp.RouteRegistrar, error) {
	return httpapp.NewGeneratedWebRouteRegistrar(newWebOpenAPIServer(handlers), newAuditLogMiddleware(handlers))
}

type routeHandlers struct {
	pool            *pgxpool.Pool
	platformHandles *platform.Handles
	catalogApp      *catalogapplication.Service
	identity        *identityweb.Handler
	identityApp     *identityapplication.Service
	identityAPI     *identitypublicapi.Handler
	membershipApp   *membershipapplication.Service
	importingApp    *importingapplication.Service
	trackingApp     *trackingapplication.Service
	reportsApp      *reportsapplication.Service
	governanceApp   *governanceapplication.Service
	webhooksApp     *webhooksapplication.Service
	fileStore       *filestore.Store
	userHomes       userHomeRepository
	tenant          *tenantweb.Handler
	tenantApp       *tenantapplication.Service
	billingApp      *billingapplication.Service
	invoiceApp      *billingapplication.InvoiceService
	referenceApp    *platformapplication.ReferenceService
	telemetryPinger *telemetryapplication.Pinger // nil when OPENTOGGL_TELEMETRY=off
}

func newRouteHandlers(pool *pgxpool.Pool, platformHandles *platform.Handles, appLogger log.Logger, telemetryPinger *telemetryapplication.Pinger) (*routeHandlers, error) {
	cache := platformHandles.Cache

	referenceService, err := platformapplication.NewReferenceService()
	if err != nil {
		return nil, err
	}

	billingService, err := billingapplication.NewService(
		newCachedAccountRepository(billingpostgres.NewAccountRepository(pool), cache),
		newCachedWorkspaceOwnershipLookup(billingpostgres.NewWorkspaceOwnershipLookup(pool), cache),
		[]billingdomain.CapabilityRule{
			{Key: "reports.profitability", MinimumPlan: billingdomain.PlanEnterprise},
			{Key: "reports.summary", MinimumPlan: billingdomain.PlanStarter, RequiresQuota: true},
			{Key: "time_tracking", MinimumPlan: billingdomain.PlanFree},
		},
		appLogger,
	)
	if err != nil {
		return nil, err
	}

	invoiceService, err := billingapplication.NewInvoiceService(
		billingpostgres.NewInvoiceStore(pool),
		appLogger,
	)
	if err != nil {
		return nil, err
	}

	tenantService, err := tenantapplication.NewService(tenantpostgres.NewStore(pool), billingService, appLogger)
	if err != nil {
		return nil, err
	}
	tenantHandler := tenantweb.NewHandler(tenantService, billingService)

	// Workspace settings and member role lookups for service-layer enforcement.
	tenantStore := tenantpostgres.NewStore(pool)
	membershipStore := membershippostgres.NewStore(pool)
	catalogSettingsLookup := catalogapplication.WorkspaceSettingsFromTenantStore(tenantStore.GetWorkspace)
	catalogMemberLookup := catalogapplication.MemberRoleFromMembershipStore(
		func(ctx context.Context, workspaceID int64, userID int64) (string, bool, error) {
			member, found, err := membershipStore.FindWorkspaceMemberByUserID(ctx, workspaceID, userID)
			if err != nil || !found {
				return "", false, err
			}
			return string(member.Role), true, nil
		},
	)

	catalogService, err := catalogapplication.NewService(
		newCachedCatalogStore(catalogpostgres.NewStore(pool), cache),
		appLogger,
		catalogapplication.WithWorkspaceSettings(catalogSettingsLookup),
		catalogapplication.WithMemberRoleLookup(catalogMemberLookup),
	)
	if err != nil {
		return nil, err
	}
	trackingStore := newCachedTrackingStore(trackingpostgres.NewStore(pool), cache)
	trackingSettingsLookup := trackingapplication.WorkspaceSettingsFromTenantStore(tenantStore.GetWorkspace)
	trackingService, err := trackingapplication.NewService(
		trackingStore,
		catalogService,
		appLogger,
		trackingapplication.WithWorkspaceSettings(trackingSettingsLookup),
	)
	if err != nil {
		return nil, err
	}

	emailSender := newEmailSenderFromDB(pool)
	siteURLReader := &siteURLReaderFromDB{pool: pool}
	membershipService, err := membershipapplication.NewService(
		membershipStore,
		membershipapplication.WithLogger(appLogger),
		membershipapplication.WithEmailSender(emailSender),
		membershipapplication.WithSiteURLReader(siteURLReader),
	)
	if err != nil {
		return nil, err
	}
	rateResolver := reportsapplication.NewCatalogRateResolver(catalogService)
	reportsService := reportsapplication.NewService(trackingService, membershipService, rateResolver, appLogger)
	reportsService.WithSavedReportStore(reportspostgres.NewSavedReportStore(pool))
	reportsService.WithScheduledReportStore(reportspostgres.NewScheduledReportStore(pool))
	webhookProber := newSafeHTTPProber(platformHandles.Webhook.HTTPClient())
	webhooksService := webhooksapplication.NewService(webhookspostgres.NewStore(pool), appLogger, webhookProber)

	governanceService, err := governanceapplication.NewService(governancepostgres.NewStore(pool), appLogger)
	if err != nil {
		return nil, err
	}
	if err := platformHandles.Jobs.Register(governancepostgres.NewAuditLogJobDefinition(governanceService)); err != nil {
		return nil, err
	}
	importingService, err := importingapplication.NewService(importingpostgres.NewStore(pool), appLogger)
	if err != nil {
		return nil, err
	}

	emailVerifier := newEmailVerifierFromDB(pool, emailSender)
	identityService := identityapplication.NewService(identityapplication.Config{
		Users:              newCachedUserRepository(identitypostgres.NewUserRepository(pool), cache),
		Sessions:           newCachedSessionRepository(identitypostgres.NewSessionRepository(pool), cache),
		PushServices:       identitypostgres.NewPushServiceRepository(pool),
		JobRecorder:        identitypostgres.NewJobRecorder(pool),
		RunningTimerLookup: trackingpostgres.NewRunningTimerLookup(pool),
		IDs:                identitypostgres.NewSequence(pool),
		KnownAlphaFeatures: []string{"calendar-redesign"},
		RegistrationGuard:  &registrationPolicyGuard{pool: pool},
		EmailVerifier:      emailVerifier,
		VerificationTokens: identitypostgres.NewVerificationTokenRepository(pool),
		Logger:             appLogger,
	})
	userHomes := newCachedUserHomeRepository(tenantpostgres.NewUserHomeRepository(pool), cache)
	shellProvider := newCachedSessionShellProvider(
		newBillingBackedSessionShell(
			tenantService,
			billingService,
			identityService,
			membershipService,
			userHomes,
		),
		cache,
	)
	identityHandler := identityweb.NewHandlerWithShell(identityService, shellProvider, siteURLReader)

	return &routeHandlers{
		pool:            pool,
		platformHandles: platformHandles,
		fileStore:       filestore.NewStore(pool),
		catalogApp:      catalogService,
		identity:        identityHandler,
		identityApp:     identityService,
		identityAPI:     identitypublicapi.NewHandler(identityService),
		membershipApp:   membershipService,
		importingApp:    importingService,
		trackingApp:     trackingService,
		reportsApp:      reportsService,
		governanceApp:   governanceService,
		webhooksApp:     webhooksService,
		userHomes:       userHomes,
		tenant:          tenantHandler,
		tenantApp:       tenantService,
		billingApp:      billingService,
		invoiceApp:      invoiceService,
		referenceApp:    referenceService,
		telemetryPinger: telemetryPinger,
	}, nil
}

// --- Shared helpers ---

func sessionID(ctx echo.Context) string {
	cookie, err := ctx.Cookie(sessionCookieName)
	if err == nil {
		return cookie.Value
	}

	raw := ctx.Request().Header.Get("Cookie")
	if raw == "" {
		return ""
	}
	parts := strings.Split(raw, ";")
	for _, part := range parts {
		token := strings.TrimSpace(part)
		if strings.HasPrefix(token, sessionCookieName+"=") {
			return strings.TrimPrefix(token, sessionCookieName+"=")
		}
	}
	return ""
}

func parsePathID(ctx echo.Context, key string) (int64, bool) {
	value, err := strconv.ParseInt(ctx.Param(key), 10, 64)
	if err != nil {
		return 0, false
	}
	return value, true
}

func (handlers *routeHandlers) writeIdentityResponse(ctx echo.Context, response identityweb.Response) error {
	if response.SessionID != "" && response.StatusCode < http.StatusBadRequest {
		setSessionCookie(ctx, response.SessionID)
	}
	if response.StatusCode == http.StatusNoContent {
		if response.SessionID == "" {
			clearSessionCookie(ctx)
		}
		return ctx.NoContent(http.StatusNoContent)
	}
	return ctx.JSON(response.StatusCode, response.Body)
}

func (handlers *routeHandlers) authorizeSession(ctx echo.Context) (error, bool) {
	response := handlers.identity.GetSession(ctx.Request().Context(), sessionID(ctx))
	if response.StatusCode == http.StatusOK {
		return nil, true
	}
	return identityHTTPError(response), false
}

func writeTenantResponse(ctx echo.Context, response tenantweb.Response) error {
	if response.StatusCode == http.StatusNoContent {
		return ctx.NoContent(http.StatusNoContent)
	}
	return ctx.JSON(response.StatusCode, response.Body)
}

func setSessionCookie(ctx echo.Context, sessionID string) {
	ctx.SetCookie(&http.Cookie{
		Name:     sessionCookieName,
		Value:    sessionID,
		HttpOnly: true,
		Secure:   resolveCookieSecure(ctx),
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
		MaxAge:   30 * 24 * 60 * 60, // 30 days
	})
}

func identityHTTPError(response identityweb.Response) error {
	return echo.NewHTTPError(response.StatusCode, response.Body)
}

func (handlers *routeHandlers) requireCurrentSessionWorkspace(ctx echo.Context, workspaceID int64) error {
	home, err := handlers.currentSessionHome(ctx)
	if err != nil {
		return err
	}
	if home.workspaceID != workspaceID {
		return echo.NewHTTPError(http.StatusForbidden, "Forbidden").
			SetInternal(errors.New("requested workspace does not match the current session workspace"))
	}
	return nil
}

func (handlers *routeHandlers) currentSessionHome(ctx echo.Context) (sessionHome, error) {
	if cached, ok := ctx.Get(currentSessionHomeContextKey).(*sessionHome); ok && cached != nil {
		return *cached, nil
	}

	user, err := handlers.identityApp.ResolveCurrentUser(ctx.Request().Context(), sessionID(ctx))
	if err != nil {
		switch {
		case errors.Is(err, identityapplication.ErrSessionNotFound),
			errors.Is(err, identitydomain.ErrUserDeactivated),
			errors.Is(err, identitydomain.ErrUserDeleted):
			return sessionHome{}, echo.NewHTTPError(http.StatusForbidden, "Forbidden").SetInternal(err)
		default:
			return sessionHome{}, echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
		}
	}

	organizationID, workspaceID, found, lookupErr := handlers.userHomes.FindByUserID(ctx.Request().Context(), user.ID)
	switch {
	case lookupErr != nil:
		return sessionHome{}, echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(lookupErr)
	case !found:
		return sessionHome{}, echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").
			SetInternal(errors.New("session home was not found for the current user"))
	default:
		home := &sessionHome{
			organizationID: organizationID,
			workspaceID:    workspaceID,
		}
		ctx.Set(currentSessionHomeContextKey, home)
		return *home, nil
	}
}

func clearSessionCookie(ctx echo.Context) {
	ctx.SetCookie(&http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		HttpOnly: true,
		Secure:   ctx.Scheme() == "https",
		Path:     "/",
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	})
}

func resolveCookieSecure(ctx echo.Context) bool {
	return ctx.Scheme() == "https"
}

// siteURLReaderFromDB reads the public site_url from instance_admin_config.
// It exposes only the site URL — no sensitive fields like SMTP credentials.
type siteURLReaderFromDB struct {
	pool *pgxpool.Pool
}

func (r *siteURLReaderFromDB) ReadSiteURL(ctx context.Context) string {
	var siteURL string
	_ = r.pool.QueryRow(ctx,
		`SELECT site_url FROM instance_admin_config WHERE id = 1`,
	).Scan(&siteURL)
	return siteURL
}
