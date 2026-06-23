package bootstrap

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	identitysaml "opentoggl/backend/apps/backend/internal/identity/saml"

	"github.com/crewjam/saml"
	"github.com/labstack/echo/v4"
)

// samlTestResultPayload is reported back to the settings page (via postMessage)
// after a dry-run login so the admin sees the real assertion the IdP returned.
type samlTestResultPayload struct {
	Ok          bool                              `json:"ok"`
	Error       string                            `json:"error,omitempty"`
	Email       string                            `json:"email,omitempty"`
	Name        string                            `json:"name,omitempty"`
	DomainMatch bool                              `json:"domainMatch"`
	Attributes  []identitysaml.AssertionAttribute `json:"attributes,omitempty"`
}

// saml2TestLogin starts a real, admin-initiated SAML login that the ACS will
// report back instead of turning into a session. It works before SSO is enabled
// (only a usable IdP config is required) so admins can verify the round-trip.
func (handlers *routeHandlers) saml2TestLogin(ctx echo.Context) error {
	workspaceID, err := handlers.authorizeWorkspaceAdmin(ctx)
	if err != nil {
		return err
	}
	requestCtx := ctx.Request().Context()

	config, found, getErr := handlers.samlConfig.Get(requestCtx, workspaceID)
	if getErr != nil {
		return handlers.writeSAMLTestPage(ctx, samlTestResultPayload{Error: "Could not load the SSO configuration."})
	}
	if !found || !config.providerConfig().Usable() {
		return handlers.writeSAMLTestPage(ctx, samlTestResultPayload{
			Error: "Save a metadata URL, or a sign-in URL plus entity ID and certificate, before running a test login.",
		})
	}

	sp, err := handlers.buildSAMLServiceProvider(ctx, config)
	if err != nil {
		return handlers.writeSAMLTestPage(ctx, samlTestResultPayload{Error: "Could not build the SAML request: " + err.Error()})
	}

	authnRequest, err := sp.MakeAuthenticationRequest(
		sp.GetSSOBindingLocation(saml.HTTPRedirectBinding),
		saml.HTTPRedirectBinding,
		saml.HTTPPostBinding,
	)
	if err != nil {
		return handlers.writeSAMLTestPage(ctx, samlTestResultPayload{Error: "Could not build the SAML request."})
	}

	pending := samlPendingLogin{WorkspaceID: workspaceID, Test: true}
	if err := handlers.platformHandles.Cache.Set(requestCtx, samlStateKey(authnRequest.ID), pending, samlLoginStateTTL); err != nil {
		return handlers.writeSAMLTestPage(ctx, samlTestResultPayload{Error: "Could not start the test."})
	}

	redirectURL, err := authnRequest.Redirect(authnRequest.ID, sp)
	if err != nil {
		return handlers.writeSAMLTestPage(ctx, samlTestResultPayload{Error: "Could not start the test."})
	}
	return ctx.Redirect(http.StatusFound, redirectURL.String())
}

// renderSAMLTestResult turns a validated (or rejected) assertion into the report
// shown to the admin, including the domain-match outcome the real login enforces.
func (handlers *routeHandlers) renderSAMLTestResult(ctx echo.Context, config samlWorkspaceConfig, assertion *saml.Assertion, parseErr error) error {
	if parseErr != nil {
		return handlers.writeSAMLTestPage(ctx, samlTestResultPayload{
			Error: "The assertion could not be validated: " + parseErr.Error(),
		})
	}

	email := identitysaml.EmailFromAssertion(assertion)
	payload := samlTestResultPayload{
		Email:       email,
		Name:        identitysaml.NameFromAssertion(assertion),
		Attributes:  identitysaml.AttributesFromAssertion(assertion),
		DomainMatch: email != "" && emailDomain(email) == strings.ToLower(strings.TrimSpace(config.EmailDomain)),
	}
	switch {
	case email == "":
		payload.Error = "The assertion did not include an email address. Map an email attribute in your identity provider."
	case !payload.DomainMatch:
		payload.Error = "The asserted email domain does not match the workspace's claimed domain, so this login would be rejected."
	default:
		payload.Ok = true
	}
	return handlers.writeSAMLTestPage(ctx, payload)
}

// writeSAMLTestPage renders a tiny page that posts the result to the opener (the
// settings page) and closes. The JSON is HTML-escaped by encoding/json, so it is
// safe to embed inside the script. The message is posted with target origin "*"
// so it is delivered regardless of dev port / site-URL differences; the opener
// re-checks event.origin against its own origin, which is the real trust boundary.
func (handlers *routeHandlers) writeSAMLTestPage(ctx echo.Context, payload samlTestResultPayload) error {
	data, err := json.Marshal(payload)
	if err != nil {
		data = []byte(`{"ok":false,"error":"internal error"}`)
	}
	return ctx.HTML(http.StatusOK, fmt.Sprintf(samlTestResultHTML, string(data)))
}

const samlTestResultHTML = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Single sign-on test</title></head>
<body style="font-family:system-ui,sans-serif;background:#0f0f10;color:#e5e5e5;padding:32px">
<p>Single sign-on test complete. You can close this window.</p>
<script>
(function () {
  var result = %s;
  try {
    if (window.opener) {
      window.opener.postMessage({ source: "opentickly-sso-test", result: result }, "*");
    }
  } catch (e) {}
  setTimeout(function () { window.close(); }, 400);
})();
</script>
</body>
</html>`
