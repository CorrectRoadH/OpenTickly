package bootstrap

import (
	"context"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"time"

	httpapp "opentoggl/backend/apps/backend/internal/http"
	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	identitysaml "opentoggl/backend/apps/backend/internal/identity/saml"

	"github.com/labstack/echo/v4"
)

// ssoCheck is one diagnostic result. Code identifies the check (the UI localizes
// the label); Detail is a dynamic, technical message safe to show the admin.
type ssoCheck struct {
	Code   string `json:"code"`
	Status string `json:"status"` // "ok" | "warn" | "error"
	Detail string `json:"detail,omitempty"`
}

type ssoTestResponse struct {
	Ok     bool       `json:"ok"` // true when no check has status "error"
	Checks []ssoCheck `json:"checks"`
}

var emailDomainPattern = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$`)

// newWebSSODiagnosticsRoutes registers the authenticated SSO config test endpoint
// alongside the generated web API. It validates an unsaved config so the admin can
// find problems on the settings page before enabling SSO.
func newWebSSODiagnosticsRoutes(handlers *routeHandlers) httpapp.RouteRegistrar {
	return func(server *echo.Echo) {
		server.POST("/web/v1/workspaces/:workspace_id/sso-config/test", handlers.testWorkspaceSsoConfig)
	}
}

func (handlers *routeHandlers) testWorkspaceSsoConfig(ctx echo.Context) error {
	workspaceID, err := handlers.authorizeWorkspaceAdmin(ctx)
	if err != nil {
		return err
	}

	var request webapi.WorkspaceSsoConfigUpdate
	if bindErr := ctx.Bind(&request); bindErr != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	reqCtx := ctx.Request().Context()
	checks := []ssoCheck{
		handlers.checkSiteURL(reqCtx),
		handlers.checkEmailDomain(reqCtx, workspaceID, request.EmailDomain),
		handlers.checkServiceProvider(reqCtx),
	}
	checks = append(checks, handlers.checkIdentityProvider(reqCtx, identitysaml.Config{
		IDPMetadataURL: strings.TrimSpace(request.IdpMetadataUrl),
		IDPEntityID:    strings.TrimSpace(request.IdpEntityId),
		IDPSSOURL:      strings.TrimSpace(request.IdpSsoUrl),
		IDPCertificate: strings.TrimSpace(request.IdpCertificate),
	})...)

	ok := true
	for _, check := range checks {
		if check.Status == "error" {
			ok = false
		}
	}
	return ctx.JSON(http.StatusOK, ssoTestResponse{Ok: ok, Checks: checks})
}

func (handlers *routeHandlers) checkSiteURL(ctx context.Context) ssoCheck {
	if strings.TrimSpace(handlers.siteURL.ReadSiteURL(ctx)) == "" {
		return ssoCheck{
			Code:   "site_url",
			Status: "warn",
			Detail: "Instance Site URL is not set; SSO URLs fall back to the request host, which may not match what your identity provider expects.",
		}
	}
	return ssoCheck{Code: "site_url", Status: "ok"}
}

func (handlers *routeHandlers) checkEmailDomain(ctx context.Context, workspaceID int64, rawDomain string) ssoCheck {
	domain := strings.ToLower(strings.TrimSpace(rawDomain))
	switch {
	case domain == "":
		return ssoCheck{Code: "email_domain", Status: "error", Detail: "Claim an email domain so the login page can route users to this workspace."}
	case !emailDomainPattern.MatchString(domain):
		return ssoCheck{Code: "email_domain", Status: "error", Detail: domain + " is not a valid domain."}
	}
	if existing, found, err := handlers.samlConfig.ResolveByEmailDomain(ctx, domain); err == nil && found && existing.WorkspaceID != workspaceID {
		return ssoCheck{Code: "email_domain", Status: "error", Detail: "This domain is already claimed by another workspace."}
	}
	return ssoCheck{Code: "email_domain", Status: "ok", Detail: domain}
}

func (handlers *routeHandlers) checkServiceProvider(ctx context.Context) ssoCheck {
	if _, err := handlers.samlConfig.ServiceProviderKeypair(ctx); err != nil {
		return ssoCheck{Code: "service_provider", Status: "error", Detail: "Could not load the Service Provider keypair: " + err.Error()}
	}
	return ssoCheck{Code: "service_provider", Status: "ok"}
}

func (handlers *routeHandlers) checkIdentityProvider(ctx context.Context, cfg identitysaml.Config) []ssoCheck {
	if !cfg.Usable() {
		return []ssoCheck{{
			Code:   "identity_provider",
			Status: "error",
			Detail: "Provide a metadata URL, or a sign-in URL plus entity ID and X.509 certificate.",
		}}
	}

	if cfg.IDPMetadataURL != "" {
		fetchCtx, cancel := context.WithTimeout(ctx, 8*time.Second)
		defer cancel()
		metadata, err := identitysaml.ResolveIDPMetadata(fetchCtx, cfg, nil)
		if err != nil {
			return []ssoCheck{{Code: "identity_provider", Status: "error", Detail: "Could not fetch or parse IdP metadata: " + err.Error()}}
		}
		if !identitysaml.HasSSOEndpoint(metadata) {
			return []ssoCheck{{Code: "identity_provider", Status: "warn", Detail: "Metadata was fetched but advertises no single sign-on endpoint."}}
		}
		return []ssoCheck{{Code: "identity_provider", Status: "ok", Detail: "Metadata reachable; sign-on endpoint found."}}
	}

	checks := []ssoCheck{}
	if !isValidHTTPURL(cfg.IDPSSOURL) {
		checks = append(checks, ssoCheck{Code: "identity_provider", Status: "error", Detail: "The IdP sign-in URL is not a valid http(s) URL."})
	} else {
		checks = append(checks, ssoCheck{Code: "identity_provider", Status: "ok"})
	}
	checks = append(checks, certificateCheck(cfg.IDPCertificate))
	return checks
}

func certificateCheck(certificate string) ssoCheck {
	cert, err := identitysaml.ParseCertificate(certificate)
	if err != nil {
		return ssoCheck{Code: "certificate", Status: "error", Detail: "The X.509 certificate could not be parsed."}
	}
	now := time.Now()
	switch {
	case now.After(cert.NotAfter):
		return ssoCheck{Code: "certificate", Status: "error", Detail: "The IdP certificate expired on " + cert.NotAfter.Format("2006-01-02") + "."}
	case cert.NotAfter.Sub(now) < 30*24*time.Hour:
		return ssoCheck{Code: "certificate", Status: "warn", Detail: "The IdP certificate expires on " + cert.NotAfter.Format("2006-01-02") + "."}
	default:
		return ssoCheck{Code: "certificate", Status: "ok", Detail: "Valid until " + cert.NotAfter.Format("2006-01-02") + "."}
	}
}

func isValidHTTPURL(raw string) bool {
	parsed, err := url.ParseRequestURI(strings.TrimSpace(raw))
	if err != nil {
		return false
	}
	return parsed.Scheme == "http" || parsed.Scheme == "https"
}
