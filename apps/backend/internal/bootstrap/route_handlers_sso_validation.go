package bootstrap

import (
	"net/http"
	"strings"
	"time"

	"opentoggl/backend/apps/backend/internal/http/httperror"
	identitysaml "opentoggl/backend/apps/backend/internal/identity/saml"
)

func validateWorkspaceSsoConfigForSave(config samlWorkspaceConfig) error {
	if !config.Enabled {
		return nil
	}

	domain := strings.ToLower(strings.TrimSpace(config.EmailDomain))
	if domain == "" || !emailDomainPattern.MatchString(domain) {
		return httperror.New(http.StatusBadRequest, "Provide a valid email domain before enabling SSO.")
	}

	provider := config.providerConfig()
	if strings.TrimSpace(provider.IDPMetadataURL) != "" {
		if err := identitysaml.ValidateMetadataURL(provider.IDPMetadataURL); err != nil {
			return httperror.New(http.StatusBadRequest, err.Error())
		}
		return nil
	}

	if !provider.Usable() {
		return httperror.New(http.StatusBadRequest, "Provide a metadata URL, or a sign-in URL plus entity ID and X.509 certificate before enabling SSO.")
	}
	if err := identitysaml.ValidateHTTPSURL(provider.IDPSSOURL); err != nil {
		return httperror.New(http.StatusBadRequest, err.Error())
	}

	certificate, err := identitysaml.ParseCertificate(provider.IDPCertificate)
	if err != nil {
		return httperror.New(http.StatusBadRequest, "Provide a valid X.509 certificate before enabling SSO.")
	}
	if time.Now().After(certificate.NotAfter) {
		return httperror.New(http.StatusBadRequest, "Provide an unexpired X.509 certificate before enabling SSO.")
	}
	return nil
}
