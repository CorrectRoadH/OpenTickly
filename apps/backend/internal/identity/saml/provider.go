package saml

import (
	"context"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/crewjam/saml"
	"github.com/crewjam/saml/samlsp"
)

// Config is a workspace's SAML identity-provider configuration. The IdP can be
// supplied either as a metadata URL (preferred) or as the individual fields
// (sign-in URL + entity id + X.509 certificate).
type Config struct {
	ProfileName    string
	EmailDomain    string
	IDPMetadataURL string
	IDPEntityID    string
	IDPSSOURL      string
	IDPCertificate string
}

// Usable reports whether the IdP side has the minimum fields to run a login: a
// metadata URL, or the full manual triple.
func (c Config) Usable() bool {
	if strings.TrimSpace(c.IDPMetadataURL) != "" {
		return true
	}
	return strings.TrimSpace(c.IDPEntityID) != "" &&
		strings.TrimSpace(c.IDPSSOURL) != "" &&
		strings.TrimSpace(c.IDPCertificate) != ""
}

// fingerprint changes whenever any input that affects the built ServiceProvider
// changes, so the Manager knows to rebuild (and re-fetch metadata).
func (c Config) fingerprint(baseURL string, workspaceID int64) string {
	return strings.Join([]string{
		baseURL,
		strconv.FormatInt(workspaceID, 10),
		c.IDPMetadataURL, c.IDPEntityID, c.IDPSSOURL, c.IDPCertificate,
	}, "\x00")
}

// SPParams are the inputs needed to build a workspace ServiceProvider.
type SPParams struct {
	Keypair     Keypair
	BaseURL     string
	WorkspaceID int64
	Config      Config
	HTTPClient  *http.Client
}

// MetadataURLFor / AcsURLFor / SignInURLFor produce the SP-side URLs we both use
// internally and display to the admin as "Integration Details".
func MetadataURLFor(baseURL string, workspaceID int64) string {
	return strings.TrimRight(baseURL, "/") + "/auth/saml2/metadata/" + strconv.FormatInt(workspaceID, 10)
}

func AcsURLFor(baseURL string, workspaceID int64) string {
	return strings.TrimRight(baseURL, "/") + "/auth/saml2/acs/" + strconv.FormatInt(workspaceID, 10)
}

func SignInURLFor(baseURL string, workspaceID int64) string {
	return strings.TrimRight(baseURL, "/") + "/auth/saml2/login/" + strconv.FormatInt(workspaceID, 10)
}

// SPMetadata returns the Service Provider metadata descriptor for a workspace.
// It needs only the SP keypair and base URL — not the IdP config — so the
// metadata endpoint works even before the IdP side is configured.
func SPMetadata(keypair Keypair, baseURL string, workspaceID int64) (*saml.EntityDescriptor, error) {
	metadataURL, err := url.Parse(MetadataURLFor(baseURL, workspaceID))
	if err != nil {
		return nil, err
	}
	acsURL, err := url.Parse(AcsURLFor(baseURL, workspaceID))
	if err != nil {
		return nil, err
	}
	sp := &saml.ServiceProvider{
		EntityID:          metadataURL.String(),
		Key:               keypair.Key,
		Certificate:       keypair.Certificate,
		MetadataURL:       *metadataURL,
		AcsURL:            *acsURL,
		AuthnNameIDFormat: saml.EmailAddressNameIDFormat,
	}
	return sp.Metadata(), nil
}

// buildServiceProvider assembles a crewjam ServiceProvider for one workspace,
// resolving the IdP metadata from the metadata URL or the manual fields.
func buildServiceProvider(ctx context.Context, p SPParams) (*saml.ServiceProvider, error) {
	metadataURL, err := url.Parse(MetadataURLFor(p.BaseURL, p.WorkspaceID))
	if err != nil {
		return nil, err
	}
	acsURL, err := url.Parse(AcsURLFor(p.BaseURL, p.WorkspaceID))
	if err != nil {
		return nil, err
	}

	idpMetadata, err := ResolveIDPMetadata(ctx, p.Config, p.HTTPClient)
	if err != nil {
		return nil, err
	}

	return &saml.ServiceProvider{
		EntityID:          metadataURL.String(),
		Key:               p.Keypair.Key,
		Certificate:       p.Keypair.Certificate,
		MetadataURL:       *metadataURL,
		AcsURL:            *acsURL,
		IDPMetadata:       idpMetadata,
		AuthnNameIDFormat: saml.EmailAddressNameIDFormat,
	}, nil
}

// ResolveIDPMetadata resolves the IdP EntityDescriptor from a metadata URL
// (fetched over HTTP) or from the manual sign-in URL + entity id + certificate.
func ResolveIDPMetadata(ctx context.Context, cfg Config, client *http.Client) (*saml.EntityDescriptor, error) {
	if trimmed := strings.TrimSpace(cfg.IDPMetadataURL); trimmed != "" {
		metadataURL, err := url.Parse(trimmed)
		if err != nil {
			return nil, err
		}
		if client == nil {
			client = http.DefaultClient
		}
		return samlsp.FetchMetadata(ctx, client, *metadataURL)
	}
	return manualIDPMetadata(cfg)
}

// ParseCertificate parses a PEM-encoded or bare-base64 X.509 certificate.
func ParseCertificate(certificate string) (*x509.Certificate, error) {
	trimmed := strings.TrimSpace(certificate)
	if trimmed == "" {
		return nil, errors.New("saml: empty certificate")
	}
	if block, _ := pem.Decode([]byte(trimmed)); block != nil {
		return x509.ParseCertificate(block.Bytes)
	}
	der, err := base64.StdEncoding.DecodeString(strings.Join(strings.Fields(trimmed), ""))
	if err != nil {
		return nil, err
	}
	return x509.ParseCertificate(der)
}

// HasSSOEndpoint reports whether an IdP descriptor advertises at least one
// SingleSignOnService endpoint.
func HasSSOEndpoint(metadata *saml.EntityDescriptor) bool {
	if metadata == nil {
		return false
	}
	for _, descriptor := range metadata.IDPSSODescriptors {
		if len(descriptor.SingleSignOnServices) > 0 {
			return true
		}
	}
	return false
}

// manualIDPMetadata builds an IdP EntityDescriptor from the admin-entered
// sign-in URL, entity id, and X.509 signing certificate.
func manualIDPMetadata(cfg Config) (*saml.EntityDescriptor, error) {
	certData, err := certificateBase64DER(cfg.IDPCertificate)
	if err != nil {
		return nil, err
	}

	return &saml.EntityDescriptor{
		EntityID: strings.TrimSpace(cfg.IDPEntityID),
		IDPSSODescriptors: []saml.IDPSSODescriptor{
			{
				SSODescriptor: saml.SSODescriptor{
					RoleDescriptor: saml.RoleDescriptor{
						ProtocolSupportEnumeration: "urn:oasis:names:tc:SAML:2.0:protocol",
						KeyDescriptors: []saml.KeyDescriptor{
							{
								Use: "signing",
								KeyInfo: saml.KeyInfo{
									X509Data: saml.X509Data{
										X509Certificates: []saml.X509Certificate{{Data: certData}},
									},
								},
							},
						},
					},
				},
				SingleSignOnServices: []saml.Endpoint{
					{Binding: saml.HTTPRedirectBinding, Location: strings.TrimSpace(cfg.IDPSSOURL)},
				},
			},
		},
	}, nil
}

// certificateBase64DER accepts either a PEM block or bare base64 DER and returns
// the base64 DER form crewjam's X509Certificate expects (no PEM headers).
func certificateBase64DER(certificate string) (string, error) {
	trimmed := strings.TrimSpace(certificate)
	if trimmed == "" {
		return "", errors.New("saml: empty IdP certificate")
	}

	if block, _ := pem.Decode([]byte(trimmed)); block != nil {
		if _, err := x509.ParseCertificate(block.Bytes); err != nil {
			return "", fmt.Errorf("saml: parse IdP certificate: %w", err)
		}
		return base64.StdEncoding.EncodeToString(block.Bytes), nil
	}

	// Bare base64 DER: strip whitespace, validate it parses.
	compact := strings.Join(strings.Fields(trimmed), "")
	der, err := base64.StdEncoding.DecodeString(compact)
	if err != nil {
		return "", fmt.Errorf("saml: decode IdP certificate: %w", err)
	}
	if _, err := x509.ParseCertificate(der); err != nil {
		return "", fmt.Errorf("saml: parse IdP certificate: %w", err)
	}
	return compact, nil
}
