package bootstrap

import (
	"net/http"
	"strings"
	"time"

	identitysaml "opentoggl/backend/apps/backend/internal/identity/saml"

	"github.com/labstack/echo/v4"
)

func validateWorkspaceSsoConfigForSave(config samlWorkspaceConfig) error {
	if !config.Enabled {
		return nil
	}

	domain := strings.ToLower(strings.TrimSpace(config.EmailDomain))
	if domain == "" || !emailDomainPattern.MatchString(domain) {
		return echo.NewHTTPError(http.StatusBadRequest, "Provide a valid email domain before enabling SSO.")
	}

	provider := config.providerConfig()
	if strings.TrimSpace(provider.IDPMetadataURL) != "" {
		if !isValidHTTPURL(provider.IDPMetadataURL) {
			return echo.NewHTTPError(http.StatusBadRequest, "Provide a valid http(s) URL for the IdP metadata URL.")
		}
		return nil
	}

	if !provider.Usable() {
		return echo.NewHTTPError(http.StatusBadRequest, "Provide a metadata URL, or a sign-in URL plus entity ID and X.509 certificate before enabling SSO.")
	}
	if !isValidHTTPURL(provider.IDPSSOURL) {
		return echo.NewHTTPError(http.StatusBadRequest, "Provide a valid http(s) URL for the IdP sign-in URL.")
	}

	certificate, err := identitysaml.ParseCertificate(provider.IDPCertificate)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Provide a valid X.509 certificate before enabling SSO.")
	}
	if time.Now().After(certificate.NotAfter) {
		return echo.NewHTTPError(http.StatusBadRequest, "Provide an unexpired X.509 certificate before enabling SSO.")
	}
	return nil
}
