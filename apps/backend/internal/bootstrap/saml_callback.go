package bootstrap

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	identitysaml "opentoggl/backend/apps/backend/internal/identity/saml"
)

func (handlers *routeHandlers) saml2ACS(ctx echo.Context) error {
	samlResponseHeaders(ctx)
	fail := func(code string) error { return ctx.Redirect(http.StatusSeeOther, "/login?sso_error="+code) }
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return fail("invalid_callback")
	}
	pending, relay, err := handlers.consumeSAMLFlow(ctx, workspaceID)
	if err != nil {
		return fail("invalid_callback")
	}
	config, found, err := handlers.samlConfig.Get(ctx.Request().Context(), workspaceID)
	if err != nil || !found || config.Revision != pending.Revision || !config.providerConfig().Usable() {
		return fail("configuration_changed")
	}
	if pending.Purpose != "test" && !config.active() {
		return fail("configuration_changed")
	}
	sp, err := handlers.buildSAMLServiceProvider(ctx, config)
	if err != nil {
		return fail("unavailable")
	}
	assertion, err := sp.ParseResponse(ctx.Request(), []string{relay})
	if err != nil {
		return fail("verification_failed")
	}
	subject, err := identitysaml.SubjectKey(assertion, sp, relay)
	if err != nil {
		return fail("verification_failed")
	}
	if pending.Purpose == "test" {
		var allowed bool
		err := handlers.pool.QueryRow(ctx.Request().Context(), `SELECT EXISTS(SELECT 1 FROM identity_sessions s JOIN identity_users u ON u.id=s.user_id JOIN membership_workspace_members m ON m.user_id=u.id JOIN tenant_workspace_sso_config c ON c.workspace_id=m.workspace_id WHERE s.id=$1 AND u.id=$2 AND u.state='active' AND m.workspace_id=$3 AND m.role='admin' AND m.state IN ('joined','restored') AND c.revision=$4)`, pending.SessionID, pending.UserID, workspaceID, pending.Revision).Scan(&allowed)
		if err != nil || !allowed {
			return fail("session_expired")
		}
		return handlers.renderSAMLTestResult(ctx, config, assertion, nil)
	}
	identity := identityapplication.SSOIdentity{WorkspaceID: workspaceID, Revision: config.Revision, IdentityRevision: config.IdentityRevision, SubjectKey: subject, Email: identitysaml.EmailFromAssertion(assertion), FullName: identitysaml.NameFromAssertion(assertion)}
	if pending.Purpose == "link" {
		err := handlers.identityApp.LinkSSO(ctx.Request().Context(), identityapplication.SSOLinkWrite{Identity: identity, UserID: pending.UserID, SessionID: pending.SessionID})
		if err != nil {
			return fail(samlErrorCode(err))
		}
		return ctx.Redirect(http.StatusSeeOther, "/profile?sso_linked=1")
	}
	result, err := handlers.identityApp.LoginOrProvisionSSO(ctx.Request().Context(), identity)
	if err != nil {
		return fail(samlErrorCode(err))
	}
	if err := handlers.joinWorkspaceAfterSSO(ctx.Request().Context(), workspaceID, result.Session.User.ID); err != nil {
		if revokeErr := handlers.identityApp.Logout(ctx.Request().Context(), result.Session.SessionID); revokeErr != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, "Could not complete SSO login").SetInternal(errors.Join(err, revokeErr))
		}
		return fail("unavailable")
	}
	setSessionCookie(ctx, result.Session.SessionID)
	return ctx.Redirect(http.StatusSeeOther, samlLoginRedirectAfterAuth)
}

func samlErrorCode(err error) string {
	switch {
	case errors.Is(err, identityapplication.ErrSSOAccountExists):
		return "account_exists"
	case errors.Is(err, identityapplication.ErrSSOConfigurationChanged):
		return "configuration_changed"
	case errors.Is(err, identityapplication.ErrSSOBindingTaken):
		return "identity_taken"
	case errors.Is(err, identityapplication.ErrSSOVerificationRequired):
		return "verification_required"
	case errors.Is(err, identityapplication.ErrRegistrationClosed):
		return "registration_closed"
	case errors.Is(err, identityapplication.ErrSessionNotFound):
		return "session_expired"
	default:
		return "verification_failed"
	}
}
