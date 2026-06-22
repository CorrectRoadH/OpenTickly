package config

// StartupConfig keeps the composition root explicit while the platform layer is
// still lightweight, so later slices can swap adapters without adding globals.
type StartupConfig struct {
	ServiceName string
	Server      ServerConfig
	Database    DatabaseConfig
	Redis       RedisConfig
	FileStore   FileStoreConfig
	Jobs        JobsConfig
	Governance  GovernanceConfig
	Telemetry   TelemetryConfig
	Webhook     WebhookConfig
	SSO         SSOConfig
}

type ServerConfig struct {
	ListenAddress string
}

type DatabaseConfig struct {
	PrimaryDSN string
}

type RedisConfig struct {
	Address string
}

type FileStoreConfig struct {
	Namespace string
}

type JobsConfig struct {
	QueueName string
}

type GovernanceConfig struct {
	AuditLogRetentionDays int
}

// TelemetryConfig controls the anonymous version-check pinger.
// Enabled by default; set OPENTOGGL_TELEMETRY=off to opt out. The endpoint
// (https://update.opentoggl.com/) is hardcoded — forkers change it in code.
type TelemetryConfig struct {
	Enabled bool
}

// WebhookConfig controls outbound HTTP fetched from user-supplied URLs.
// AllowPrivateTargets=false is the safe default: loopback, RFC1918, link-local
// (including 169.254.169.254), and CGNAT ranges are refused to prevent SSRF
// against the host, the local network, and cloud metadata endpoints. Operators
// on a trusted LAN that genuinely needs to reach intranet webhook receivers can
// set OPENTOGGL_WEBHOOK_ALLOW_PRIVATE_TARGETS=true to opt back in.
type WebhookConfig struct {
	AllowPrivateTargets bool
}

// SSOConfig configures instance-level OpenID Connect single sign-on. When
// Enabled is false (the default) the SSO login routes are inert and the login
// page hides the SSO button. SSO is instance-wide: one identity provider
// authenticates every workspace, which is the practical shape for a
// self-hosted deployment (Google, Authentik, Keycloak, Okta, ...).
//
// IssuerURL must be the OIDC issuer that serves /.well-known/openid-configuration.
// RedirectURL is optional: when empty it is derived from the configured site
// URL (admin settings) and otherwise from the inbound request, suffixed with
// /auth/sso/callback. It must exactly match a redirect URI registered with the
// identity provider.
type SSOConfig struct {
	Enabled      bool
	IssuerURL    string
	ClientID     string
	ClientSecret string
	RedirectURL  string
	ProviderName string
}
