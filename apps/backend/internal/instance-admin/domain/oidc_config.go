package domain

import (
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"
)

var (
	ErrOIDCConfigInvalid  = errors.New("invalid OpenID Connect configuration")
	ErrOIDCConfigConflict = errors.New("OpenID Connect configuration was changed by someone else")
)

const maxOIDCProviderNameLength = 64

// OIDCConfig is the instance-level OpenID Connect provider configuration. One
// provider authenticates every workspace; see docs/instance-oidc-sso.
type OIDCConfig struct {
	Enabled             bool
	ProviderName        string
	IssuerURL           string
	ClientID            string
	ClientSecret        string
	AllowedEmailDomains []string
	AutoProvision       bool
	Revision            int64
	UpdatedAt           time.Time
}

// OIDCValidationError names the field that failed so the admin UI can point at it.
type OIDCValidationError struct {
	Field  string
	Reason string
}

func (e *OIDCValidationError) Error() string {
	return fmt.Sprintf("%s: %s", e.Field, e.Reason)
}

func (e *OIDCValidationError) Unwrap() error { return ErrOIDCConfigInvalid }

// Normalize trims every text field and lower-cases the email domains.
func (c OIDCConfig) Normalize() OIDCConfig {
	c.ProviderName = strings.TrimSpace(c.ProviderName)
	c.IssuerURL = strings.TrimRight(strings.TrimSpace(c.IssuerURL), "/")
	c.ClientID = strings.TrimSpace(c.ClientID)
	c.ClientSecret = strings.TrimSpace(c.ClientSecret)
	c.AllowedEmailDomains = NormalizeEmailDomains(c.AllowedEmailDomains)
	return c
}

// NormalizeEmailDomains lower-cases, trims, drops empties and duplicates.
func NormalizeEmailDomains(domains []string) []string {
	seen := map[string]struct{}{}
	result := make([]string, 0, len(domains))
	for _, domain := range domains {
		domain = strings.ToLower(strings.TrimSpace(domain))
		domain = strings.TrimPrefix(domain, "@")
		if domain == "" {
			continue
		}
		if _, dup := seen[domain]; dup {
			continue
		}
		seen[domain] = struct{}{}
		result = append(result, domain)
	}
	return result
}

// Validate enforces the saving rules. A disabled draft may be incomplete; an
// enabled configuration must be usable end to end, including an HTTPS Site URL
// for the Secure browser cookie and the provider redirect.
func (c OIDCConfig) Validate(siteURL string) error {
	if len(c.ProviderName) > maxOIDCProviderNameLength {
		return &OIDCValidationError{Field: "provider_name", Reason: "must be at most 64 characters"}
	}
	for _, domain := range c.AllowedEmailDomains {
		if strings.ContainsAny(domain, "@/ ") || !strings.Contains(domain, ".") {
			return &OIDCValidationError{Field: "allowed_email_domains", Reason: "contains an invalid domain"}
		}
	}
	if c.IssuerURL != "" {
		if err := validateHTTPSURL(c.IssuerURL); err != nil {
			return &OIDCValidationError{Field: "issuer_url", Reason: err.Error()}
		}
	}
	if !c.Enabled {
		return nil
	}
	if c.IssuerURL == "" {
		return &OIDCValidationError{Field: "issuer_url", Reason: "is required to enable single sign-on"}
	}
	if c.ClientID == "" {
		return &OIDCValidationError{Field: "client_id", Reason: "is required to enable single sign-on"}
	}
	if c.ClientSecret == "" {
		return &OIDCValidationError{Field: "client_secret", Reason: "is required to enable single sign-on"}
	}
	if err := validateHTTPSURL(strings.TrimSpace(siteURL)); err != nil {
		return &OIDCValidationError{Field: "site_url", Reason: "an HTTPS Site URL must be configured before enabling single sign-on"}
	}
	return nil
}

// AllowsEmail reports whether the email passes the domain allow-list. An empty
// list allows any address.
func (c OIDCConfig) AllowsEmail(email string) bool {
	if len(c.AllowedEmailDomains) == 0 {
		return true
	}
	at := strings.LastIndex(email, "@")
	if at < 0 || at == len(email)-1 {
		return false
	}
	domain := strings.ToLower(email[at+1:])
	for _, allowed := range c.AllowedEmailDomains {
		if domain == allowed {
			return true
		}
	}
	return false
}

// DisplayName falls back to the issuer host when the admin left the name blank.
func (c OIDCConfig) DisplayName() string {
	if c.ProviderName != "" {
		return c.ProviderName
	}
	if parsed, err := url.Parse(c.IssuerURL); err == nil && parsed.Host != "" {
		return parsed.Host
	}
	return "Single sign-on"
}

// TrustChanged reports whether saving `next` over `c` changes which subjects are
// meaningful, in which case every existing binding must be dropped.
func (c OIDCConfig) TrustChanged(next OIDCConfig) bool {
	return c.IssuerURL != next.IssuerURL || c.ClientID != next.ClientID
}

func validateHTTPSURL(raw string) error {
	parsed, err := url.Parse(raw)
	if err != nil || parsed.Scheme != "https" || parsed.Host == "" {
		return errors.New("must be an https URL")
	}
	if parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" {
		return errors.New("must not contain credentials, a query or a fragment")
	}
	return nil
}
